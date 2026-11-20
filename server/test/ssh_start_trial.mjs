/** 快速 Tunnel 试跑：上传 proxy.mjs → Mac 上启动代理 + cloudflared quick tunnel → 打印公网 URL */
import { Client } from "ssh2";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROXY_REMOTE = "/Users/a123/apps/proxy.mjs";
const CF_LOG = "/Users/a123/apps/quicktunnel.log";

const conn = new Client();
conn.on("ready", () => {
  conn.sftp((err, sftp) => {
    if (err) { console.error(err.message); conn.end(); return; }
    const local = path.join(path.dirname(fileURLToPath(import.meta.url)), "proxy.mjs");
    sftp.fastPut(local, PROXY_REMOTE, (e2) => {
      if (e2) { console.error("sftp:", e2.message); conn.end(); return; }
      const cmd = [
        "export PATH=/usr/local/bin:$PATH",
        // 清理旧进程（按特征匹配，不影响 mysql/游戏服）
        "pkill -f 'node .*apps/proxy.mjs' 2>/dev/null; pkill -f 'cloudflared tunnel --url' 2>/dev/null; sleep 1",
        `nohup node ${PROXY_REMOTE} > /Users/a123/apps/proxy.log 2>&1 &`,
        `nohup cloudflared tunnel --url http://127.0.0.1:8180 > ${CF_LOG} 2>&1 &`,
        "sleep 8",
        `grep -o 'https://[a-z0-9-]*\\.trycloudflare\\.com' ${CF_LOG} | head -1`,
        "echo PROXY_RUNNING=$(pgrep -f 'node .*apps/proxy.mjs' | head -1)",
        "echo CF_RUNNING=$(pgrep -f 'cloudflared tunnel --url' | head -1)",
      ].join("; ");
      conn.exec(cmd, { readyTimeout: 10000 }, (e3, stream) => {
        if (e3) { console.error(e3.message); conn.end(); return; }
        let out = "";
        stream.on("close", () => { console.log(out.trim()); conn.end(); })
          .on("data", (d) => { out += d; })
          .stderr.on("data", (d) => { out += d; });
      });
    });
  });
}).on("error", (e) => { console.error(e.message); process.exit(1); })
  .connect({ host: "10.10.100.85", port: 22, username: "123", password: "123456", readyTimeout: 10000 });
