/** 快速 Tunnel 链路验证：HTTPS 登录 + WSS auth（均走 trycloudflare 入口） */
const BASE = process.argv[2];
if (!BASE) { console.error("usage: node tunnel_verify.mjs https://xxx.trycloudflare.com"); process.exit(1); }

const r = await fetch(`${BASE}/api/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: "remote_test", password: "test123" }),
});
const j = await r.json();
console.log("HTTP", r.status, "code:", j.code, "userId:", j.userId, "token:", j.token ? j.token.slice(0, 8) + "..." : "-");
if (!j.token) { console.log("HTTP_FAIL"); process.exit(1); }

const { default: WebSocket } = await import("ws");
const ws = new WebSocket(BASE.replace(/^http/, "ws"));
const result = await new Promise((resolve) => {
  const t = setTimeout(() => resolve("WS_TIMEOUT"), 15000);
  ws.on("open", () => ws.send(JSON.stringify({ type: "auth", token: j.token })));
  ws.on("message", (d) => { clearTimeout(t); resolve(d.toString()); });
  ws.on("error", (e) => { clearTimeout(t); resolve("WS_ERR:" + e.message); });
});
console.log("WS:", result);
ws.close();
process.exit(result.includes('"type":"auth_result"') || result.includes("ok") ? 0 : 1);
