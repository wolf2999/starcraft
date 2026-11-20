/**
 * 通用远程发布脚本（ssh2 直连，无额外依赖）：本地 build → SFTP 上传 → 远程 MySQL 保障 → 重启并校验。
 *
 * 目录约定（多项目统一管理）：
 *   /Users/<user>/apps/<project>/     —— 每个项目一个独立目录（发布时询问后创建）
 *     ├─ dist/  node_modules/  package.json  config.json
 *     └─ server.log                        —— 项目自己的运行日志
 * 数据隔离：每个项目使用独立的 MySQL database（deploy.config.json 的 dbName）。
 *
 * 运行：npm run deploy （在 server/ 目录）
 */
import { Client } from "ssh2";
import { execSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import fs from "node:fs";
import path from "node:path";

const cfg = JSON.parse(fs.readFileSync(new URL("./deploy.config.json", import.meta.url), "utf8"));
const LOCAL_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const PROJECT_DIR = `${cfg.remoteRoot}/${cfg.project}`;

const rl = createInterface({ input: process.stdin, output: process.stdout });
// --auto：自动应答所有询问（CI/无人值守）；--skip-mysql：跳过 MySQL 保障环节（默认交互模式不传参）
const AUTO = process.argv.includes("--auto");
const SKIP_MYSQL = process.argv.includes("--skip-mysql");
const ask = async (q) => {
  if (AUTO) { console.log(`${q}（--auto 自动应答: y）`); return true; }
  const a = (await rl.question(q)).trim().toLowerCase();
  return a === "" || a === "y" || a === "yes";
};

let conn, sftp;

/** 远程执行命令（统一注入 brew PATH），返回 {code, out} */
function run(cmd, timeoutMs = 120000) {
  return new Promise((resolve) => {
    conn.exec(`export PATH=/usr/local/bin:$PATH; ${cmd}`, { readyTimeout: 10000 }, (err, stream) => {
      if (err) return resolve({ code: -1, out: `exec 失败: ${err.message}` });
      let out = "";
      const timer = setTimeout(() => { stream.close(); }, timeoutMs);
      stream.on("close", (code) => { clearTimeout(timer); resolve({ code, out }); })
        .on("data", (d) => { process.stdout.write(d); out += d; })
        .stderr.on("data", (d) => { out += d; });
    });
  });
}

const exists = (p) => new Promise((res) => sftp.lstat(p, (e) => res(!e)));
const mkdir = (p) => new Promise((res, rej) => sftp.mkdir(p, (e) => (e ? rej(e) : res())));
/** 远程递归建目录：串行执行避免并发 worker 对同一目录竞态 mkdir；容忍"已存在"错误 */
let mkdirChain = Promise.resolve();
function mkdirp(p) {
  mkdirChain = mkdirChain.then(async () => {
    for (const seg of p.split("/").filter(Boolean).map((s, i, arr) => "/" + arr.slice(0, i + 1).join("/"))) {
      if (!(await exists(seg))) {
        try { await mkdir(seg); } catch {
          if (!(await exists(seg))) throw new Error(`mkdir 失败: ${seg}`);
        }
      }
    }
  });
  return mkdirChain;
}

/** 递归收集本地文件（相对路径列表） */
function walk(dir, base = dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === ".DS_Store") continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, base, acc);
    else acc.push(path.relative(base, full).replaceAll("\\", "/"));
  }
  return acc;
}

/** 并发上传本地目录到远程 */
async function uploadDir(localDir, remoteDir, concurrency = 8) {
  const files = walk(localDir);
  await mkdirp(remoteDir);
  let done = 0;
  const put = (rel) => new Promise((res, rej) => {
    const rp = `${remoteDir}/${rel}`;
    sftp.fastPut(path.join(localDir, rel), rp, (e) => (e ? rej(new Error(`${rel}: ${e.message}`)) : res()));
  });
  const queue = [...files];
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const rel = queue.shift();
      await mkdirp(path.posix.dirname(`${remoteDir}/${rel}`));
      await put(rel);
      if (++done % 100 === 0) console.log(`  上传中 ${done}/${files.length}`);
    }
  }));
  console.log(`  上传完成 ${files.length} 个文件 → ${remoteDir}`);
}

async function uploadFile(localPath, remotePath) {
  await mkdirp(path.posix.dirname(remotePath));
  await new Promise((res, rej) => sftp.fastPut(localPath, remotePath, (e) => (e ? rej(e) : res())));
}

async function main() {
  // 1. 本地构建
  console.log("[1/5] 本地构建 server TS ...");
  execSync("npm run build", { cwd: LOCAL_DIR, stdio: "inherit" });

  // 2. 连接
  console.log(`[2/5] 连接 ${cfg.user}@${cfg.host} ...`);
  await new Promise((res, rej) => {
    conn = new Client()
      .on("ready", res)
      .on("error", rej)
      .connect({ host: cfg.host, port: cfg.port, username: cfg.user, password: cfg.password, readyTimeout: 10000 });
  });
  sftp = await new Promise((res, rej) => conn.sftp((e, s) => (e ? rej(e) : res(s))));

  // 3. 项目目录：存在则复用，不存在询问后创建（多项目统一根目录）
  console.log(`[3/5] 项目目录 ${PROJECT_DIR}`);
  if (await exists(PROJECT_DIR)) {
    console.log("  已存在，直接复用");
  } else if (await ask(`  不存在，是否创建 ${PROJECT_DIR}？(Y/n) `)) {
    await mkdirp(PROJECT_DIR);
    console.log("  已创建");
  } else {
    console.log("已取消发布"); conn.end(); process.exit(0);
  }

  // 4. MySQL 保障：远程自装 MySQL（官方 tarball，绕开 brew）+ 每项目独立 database
  console.log("[4/5] 检查远程 MySQL ...");
  const isOpen = `nc -z -w 2 127.0.0.1 3306 && echo OPEN || echo CLOSED`;
  let dbUp = (await run(isOpen, 15000)).out.includes("OPEN");
  if (SKIP_MYSQL) {
    console.log("  --skip-mysql：跳过 MySQL 保障环节");
  } else {
    const mysqlReady = await run("ls $HOME/mysql8/bin/mysqld 2>/dev/null && echo YES || echo NO", 15000);
    const hasMysql = mysqlReady.out.includes("YES");
    if (!dbUp && hasMysql) {
      console.log("  MySQL 已安装未运行，拉起 mysqld ...");
      await run(`nohup $HOME/mysql8/bin/mysqld --basedir=$HOME/mysql8 --datadir=$HOME/mysql8/data --port=3306 --bind-address=127.0.0.1 --socket=/tmp/mysql-sc.sock & sleep 6; true`, 60000);
      dbUp = (await run(isOpen, 15000)).out.includes("OPEN");
    }
    if (!dbUp) {
      if (await ask("  远程未安装 MySQL，是否自动安装（官方 tarball 约 500MB，需数分钟）？(Y/n) ")) {
        console.log("  下载安装中（输出见上方）...");
        const probe = (v) => `c=$(curl -sIL -o /dev/null -w '%{http_code}' --connect-timeout 10 'https://cdn.mysql.com/Downloads/MySQL-8.0/mysql-${v}-macos14-x86_64.tar.gz'); [ "$c" = "200" ] && echo ${v} && break`;
        const steps = [
          `for v in 8.0.43 8.0.42 8.0.41 8.0.40 8.0.39 8.0.37 8.0.36; do ${probe("${v}")} done`,
          `V=$(for v in 8.0.43 8.0.42 8.0.41 8.0.40 8.0.39 8.0.37 8.0.36; do ${probe("${v}")} done)`,
          `[ -z "$V" ] && echo 未找到可用 MySQL 包 && exit 9`,
          `curl -fL -o /tmp/mysql8.tar.gz 'https://cdn.mysql.com/Downloads/MySQL-8.0/mysql-'"$V"'-macos14-x86_64.tar.gz'`,
          `rm -rf $HOME/mysql8 && mkdir -p $HOME/mysql8 && tar xzf /tmp/mysql8.tar.gz -C $HOME/mysql8 --strip-components=1`,
          `$HOME/mysql8/bin/mysqld --initialize-insecure --basedir=$HOME/mysql8 --datadir=$HOME/mysql8/data`,
          `nohup $HOME/mysql8/bin/mysqld --basedir=$HOME/mysql8 --datadir=$HOME/mysql8/data --port=3306 --bind-address=127.0.0.1 --socket=/tmp/mysql-sc.sock & sleep 6; true`,
          `for i in 1 2 3 4 5; do nc -z -w 2 127.0.0.1 3306 && break; sleep 3; done; true`,
        ].join("; ");
        const r = await run(steps, 600000);
        dbUp = (await run(isOpen, 15000)).out.includes("OPEN");
        if (!dbUp) { console.error("  安装/启动失败，中止"); conn.end(); process.exit(1); }
      } else {
        console.log("  跳过（服务器启动会因无数据库失败，后续可再跑一次本脚本补装）");
      }
    }
    if (dbUp) {
      // root 密码与本地 config 保持一致 + 建本项目独立库（幂等；tarball 装法用 socket 客户端）
      await run(`$HOME/mysql8/bin/mysql --socket=/tmp/mysql-sc.sock -uroot -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '123456'; CREATE DATABASE IF NOT EXISTS ${cfg.dbName};" 2>&1 || $HOME/mysql8/bin/mysql --socket=/tmp/mysql-sc.sock -uroot -p123456 -e "CREATE DATABASE IF NOT EXISTS ${cfg.dbName};" 2>&1`, 30000);
      console.log(`  MySQL 就绪，项目数据库 ${cfg.dbName} 已确保存在`);
    }
  }

  // 5. 上传（清旧 dist/node_modules 防残留）+ 重启 + 校验
  console.log("[5/5] 上传与重启 ...");
  await run(`rm -rf ${PROJECT_DIR}/dist ${PROJECT_DIR}/node_modules`);
  await uploadDir(path.join(LOCAL_DIR, "dist"), `${PROJECT_DIR}/dist`);
  await uploadDir(path.join(LOCAL_DIR, "node_modules"), `${PROJECT_DIR}/node_modules`);
  await uploadFile(path.join(LOCAL_DIR, "package.json"), `${PROJECT_DIR}/package.json`);
  await uploadFile(path.join(LOCAL_DIR, "config.json"), `${PROJECT_DIR}/config.json`);

  const match = `${cfg.project}/dist/main.js`.replaceAll(".", "\\.");
  await run(`pkill -f '${match}' 2>/dev/null; sleep 0.5; true`);
  await run(`cd ${PROJECT_DIR} && nohup ${cfg.nodeBin} ${cfg.startCmd} > server.log 2>&1 & sleep 1.5; true`);
  const up = await run(`tail -5 ${PROJECT_DIR}/server.log; /usr/sbin/lsof -i :8100 -i :8101 | tail -3`, 15000);

  console.log(`\n===== 部署结果 =====`);
  console.log(`目录: ${PROJECT_DIR}`);
  console.log(`启动命令: cd ${PROJECT_DIR} && ${cfg.nodeBin} ${cfg.startCmd}（日志 server.log）`);
  console.log(`端口校验: ${up.out.includes("LISTEN") ? "8100/8101 已监听 ✓" : "未监听 ✗（查看 server.log 排查）"}`);
  conn.end();
}

main().catch((e) => { console.error("发布失败:", e.message); conn?.end(); process.exit(1); }).finally(() => rl.close());
