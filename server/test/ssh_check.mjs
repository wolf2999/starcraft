/** SSH 连通性实测：密码登录 Mac mini 并执行探针命令（发布前手动跑一次） */
import { Client } from "ssh2";

const HOST = "10.10.100.85";
const conn = new Client();
conn
  .on("ready", () => {
    console.log(`[ok] SSH 登录成功: 123@${HOST}`);
    conn.exec("uname -a && sw_vers 2>/dev/null; which node npm; node -v 2>/dev/null; ls /usr/local/bin | head -5", (err, stream) => {
      if (err) { console.error("[err] exec:", err.message); conn.end(); return; }
      let out = "";
      stream.on("close", () => { console.log(out); conn.end(); })
        .on("data", (d) => { out += d; })
        .stderr.on("data", (d) => { out += d; });
    });
  })
  .on("error", (e) => { console.error("[fail] SSH 连接失败:", e.message); process.exit(1); })
  .connect({ host: HOST, port: 22, username: "123", password: "123456", readyTimeout: 10000 });
