/** 对战中转发与结算：cmd 转发主机、snapshot 转发成员、game_over 落库广播、断线判负 */
import { MSG, ERR } from "../common/packet";
import * as user_dao from "../db/user_dao";
import type { Ctx, Room, RoomPlayer } from "../types";

const battleRooms = new Map<string, Room>(); // roomId -> room（进行中的对局）

export function beginBattle(room: Room): void {
  battleRooms.set(room.id, room);
}

function isHost(room: Room, ctx: Ctx): boolean {
  return room.hostUid === ctx.userId;
}

function hostCtxOf(room: Room): Ctx | null {
  const p = room.players.get(room.hostUid);
  return p && p.online ? p.ctx : null;
}

/** 非主机 → 主机：指令转发（不解析内容，只做角色校验）。成功返回 true，失败返回错误码 */
export function forwardCmd(ctx: Ctx, msg: any): true | number {
  const room = ctx.room;
  if (!room || room.startedAt === 0 || !battleRooms.has(room.id)) return ERR.NOT_IN_BATTLE;
  if (isHost(room, ctx)) return true; // 主机自己的指令不经服务器
  const hostCtx = hostCtxOf(room);
  if (!hostCtx) return true; // 主机已断线（结算由断线逻辑处理）
  hostCtx.send({ type: MSG.CMD_FROM, from: ctx.userId, cmd: msg.cmd, seq: msg.seq });
  return true;
}

/** 主机 → 成员：快照转发。成功返回 true，失败返回错误码 */
export function forwardSnapshot(ctx: Ctx, msg: any): true | number {
  const room = ctx.room;
  if (!room || room.startedAt === 0 || !battleRooms.has(room.id)) return ERR.NOT_IN_BATTLE;
  if (!isHost(room, ctx)) return ERR.FORBIDDEN;
  for (const p of room.players.values()) {
    if (p.online && p.uid !== room.hostUid && p.ctx) {
      p.ctx.send({
        type: MSG.SNAPSHOT_TO,
        tick: msg.tick,
        ents: msg.ents,
        res: msg.res,
        supply: msg.supply,
      });
    }
  }
  return true;
}

/** 结束战斗：仅主机发起。落库 + 全员广播 + 房间销毁。成功返回 true，失败返回错误码 */
export function gameOver(ctx: Ctx, msg: { winner: "A" | "B" | "draw" }): true | number {
  const room = ctx.room;
  if (!room || room.startedAt === 0 || !battleRooms.has(room.id)) return ERR.NOT_IN_BATTLE;
  if (!isHost(room, ctx)) return ERR.FORBIDDEN;
  const winner = msg.winner;
  if (!["A", "B", "draw"].includes(winner)) return ERR.PARAM;

  const teamA = room.slots.filter((s) => s.team === "A").map((s) => s.uid);
  const teamB = room.slots.filter((s) => s.team === "B").map((s) => s.uid);
  const records: Record<string, { team: string; winner: boolean | "draw" }> = {};
  for (const s of room.slots) {
    records[s.name] = { team: s.team, winner: winner === "draw" ? "draw" : s.team === winner };
  }

  user_dao
    .recordBattle({
      roomId: room.id,
      teamSize: room.teamSize,
      teamA,
      teamB,
      winner,
      startedAt: room.startedAt,
      endedAt: Date.now(),
    })
    .catch((err) => console.error("[battle] 战报落库失败:", err));

  for (const p of room.players.values()) {
    if (p.online && p.ctx) p.ctx.send({ type: MSG.GAME_OVER, winner, records });
  }
  battleRooms.delete(room.id);
  // 房间整体销毁（对局结束即散场）
  for (const p of room.players.values()) p.ctx && (p.ctx.room = null);
  console.log(`[battle] ${room.id} 结束，胜方=${winner}`);
  return true;
}

/** 战斗中玩家掉线：广播 player_left；若全队掉线判负；主机掉线判主机方负 */
export function onPlayerOffline(room: Room, player: RoomPlayer, reason: string): void {
  player.online = false;
  player.ctx = null;
  const leftMsg = { type: MSG.PLAYER_LEFT, slot: player.slot, reason };
  for (const p of room.players.values()) {
    if (p.online && p.ctx) p.ctx.send(leftMsg);
  }
  console.log(`[battle] ${room.id} 玩家离线 slot${player.slot}（${reason}）`);

  const alive = [...room.players.values()].filter((p) => p.online);
  const teamAAlive = room.slots.filter((s) => s.team === "A" && alive.some((p) => p.uid === s.uid));
  const teamBAlive = room.slots.filter((s) => s.team === "B" && alive.some((p) => p.uid === s.uid));

  let winner: "A" | "B" | null = null;
  if (room.hostUid === player.uid) {
    // 主机掉线（换主机能力省略）：主机方判负
    const hostSlot = room.slots.find((s) => s.uid === room.hostUid)!;
    winner = hostSlot.team === "A" ? "B" : "A";
  } else if (teamAAlive.length === 0 && teamBAlive.length > 0) {
    winner = "B";
  } else if (teamBAlive.length === 0 && teamAAlive.length > 0) {
    winner = "A";
  }
  if (winner) {
    endByDisconnect(room, winner);
  }
}

/** 断线判负结算（无需主机消息）：落库 + 广播 + 销毁 */
function endByDisconnect(room: Room, winner: "A" | "B"): void {
  const teamA = room.slots.filter((s) => s.team === "A").map((s) => s.uid);
  const teamB = room.slots.filter((s) => s.team === "B").map((s) => s.uid);
  user_dao
    .recordBattle({
      roomId: room.id,
      teamSize: room.teamSize,
      teamA,
      teamB,
      winner,
      startedAt: room.startedAt,
      endedAt: Date.now(),
    })
    .catch((err) => console.error("[battle] 断线战报落库失败:", err));
  for (const p of room.players.values()) {
    if (p.online && p.ctx) {
      p.ctx.send({ type: MSG.GAME_OVER, winner, reason: "disconnect" });
    }
  }
  battleRooms.delete(room.id);
  for (const p of room.players.values()) p.ctx && (p.ctx.room = null);
  console.log(`[battle] ${room.id} 因断线结束，胜方=${winner}`);
}
