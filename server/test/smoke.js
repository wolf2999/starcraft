/** M2 冒烟测试：模拟两客户端走完 注册→登录→建房→加入→开始→cmd/snapshot 转发→game_over。
 * 用法：server 运行中，node test/smoke.js */
const http = require("http");
const { WebSocket } = require("ws");

const HTTP = "http://127.0.0.1:8100";
const WS = "ws://127.0.0.1:8101";

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      HTTP + path,
      { method: "POST", headers: { "Content-Type": "application/json" } },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => resolve(JSON.parse(buf)));
      }
    );
    req.on("error", reject);
    req.end(data);
  });
}

/** 简易 WS 客户端：收到的消息排队，wait(type) 取一条指定类型 */
function client(name) {
  const c = { name, inbox: [], waiters: [], ws: null };
  c.connect = () =>
    new Promise((resolve, reject) => {
      c.ws = new WebSocket(WS);
      c.ws.on("open", resolve);
      c.ws.on("error", reject);
      c.ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        const w = c.waiters.find((x) => x.type === msg.type);
        if (w) {
          c.waiters.splice(c.waiters.indexOf(w), 1);
          w.resolve(msg);
        } else {
          c.inbox.push(msg);
        }
      });
    });
  c.send = (obj) => c.ws.send(JSON.stringify(obj));
  c.wait = (type, timeoutMs = 3000) =>
    new Promise((resolve, reject) => {
      const i = c.inbox.findIndex((m) => m.type === type);
      if (i >= 0) return resolve(c.inbox.splice(i, 1)[0]);
      const w = { type, resolve };
      c.waiters.push(w);
      setTimeout(() => {
        const j = c.waiters.indexOf(w);
        if (j >= 0) {
          c.waiters.splice(j, 1);
          reject(new Error(`${name} 等待 ${type} 超时`));
        }
      }, timeoutMs);
    });
  c.close = () => c.ws.close();
  return c;
}

let failed = 0;
function check(name, cond, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name} ${cond ? "" : extra}`);
  if (!cond) failed++;
}

(async () => {
  // 注册 + 登录
  await post("/api/register", { username: "t1", password: "1234" });
  await post("/api/register", { username: "t2", password: "1234" });
  const l1 = await post("/api/login", { username: "t1", password: "1234" });
  const l2 = await post("/api/login", { username: "t2", password: "1234" });
  check("HTTP 登录拿到 token", l1.code === 0 && l2.code === 0);

  const c1 = client("c1(host)");
  const c2 = client("c2");
  await c1.connect();
  await c2.connect();

  // auth
  c1.send({ type: "auth", token: l1.token });
  const a1 = await c1.wait("auth_ok");
  check("c1 auth", a1.userId === l1.userId);
  c2.send({ type: "auth", token: l2.token });
  const a2 = await c2.wait("auth_ok");
  check("c2 auth", a2.userId === l2.userId);

  // 建房 1v1
  c1.send({ type: "create_room", teamSize: 1, race: "terran" });
  const rs1 = await c1.wait("room_state");
  const roomId = rs1.roomId;
  check("建房收到 room_state", !!roomId && rs1.players.length === 1 && rs1.players[0].host);

  // 加入
  c2.send({ type: "join_room", roomId, race: "zerg" });
  const rs2 = await c1.wait("room_state");
  const rs2b = await c2.wait("room_state");
  check("加入后双端收到 room_state", rs2.players.length === 2 && rs2b.players.length === 2);
  const p2 = rs2.players.find((p) => p.uid === l2.userId);
  check("c2 自动分到 B 队", p2 && p2.team === "B");

  // 未对等时开始应被拒
  c1.send({ type: "leave_room" });
  c2.send({ type: "leave_room" });
  await new Promise((r) => setTimeout(r, 100));
  c1.send({ type: "create_room", teamSize: 1, race: "terran" });
  const rs3 = await c1.wait("room_state");
  const roomId2 = rs3.roomId;
  c2.send({ type: "join_room", roomId: roomId2 });
  await c1.wait("room_state");
  await c2.wait("room_state");
  // c2 离开制造不对等（离开者不收广播）
  c2.send({ type: "leave_room" });
  await c1.wait("room_state");
  c1.send({ type: "start" });
  const err1 = await c1.wait("error");
  check("人数不对等开始被拒", err1.code === 108);
  c2.send({ type: "join_room", roomId: roomId2 });
  await c1.wait("room_state");
  await c2.wait("room_state");

  // 开始
  c1.send({ type: "start" });
  const sg1 = await c1.wait("start_game");
  const sg2 = await c2.wait("start_game");
  check("双端收到 start_game", sg1.seed === sg2.seed && sg1.slots.length === 2);
  check("主机占 slot0/player", sg1.slots[0].owner === "player" && sg1.slots[0].uid === l1.userId);
  check("c2 占 slot1/ai1", sg1.slots[1].owner === "ai1" && sg1.slots[1].uid === l2.userId);

  // 非主机 cmd → 主机
  c2.send({ type: "cmd", roomId: roomId2, seq: 1, cmd: { kind: "move", ids: [7], x: 10, y: 20 } });
  const cf = await c1.wait("cmd_from");
  check("cmd 转发主机", cf.from === l2.userId && cf.cmd.kind === "move" && cf.seq === 1);

  // 主机 snapshot → 成员
  c1.send({ type: "snapshot", roomId: roomId2, tick: 5, ents: [{ id: 7, x: 1, y: 2 }] });
  const sn = await c2.wait("snapshot_to");
  check("snapshot 转发成员", sn.tick === 5 && sn.ents[0].id === 7);

  // game_over
  c1.send({ type: "game_over", roomId: roomId2, winner: "A" });
  const go1 = await c1.wait("game_over");
  const go2 = await c2.wait("game_over");
  check("双端收到 game_over", go1.winner === "A" && go2.winner === "A");

  c1.close();
  c2.close();
  console.log(failed === 0 ? "\n全部通过" : `\n${failed} 项失败`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => {
  console.error("测试异常:", err.message);
  process.exit(1);
});
