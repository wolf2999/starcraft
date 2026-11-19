/** 房间生命周期：创建/加入/离开/换阵营/开始校验(对等)/广播 room_state。
 * rooms 纯内存，不持久化。slot 0..7 ↔ 客户端 owner（slot0='player'，其余='ai1'..'ai7'）。 */
import * as crypto from "crypto";
import { MSG, ERR } from "../common/packet";
import type { Ctx, Room, RoomPlayer, SlotInfo, Race } from "../types";
import { onlineCtx } from "./user_mgr";
import * as battle_mgr from "./battle_mgr";

/** roomId -> room */
export const rooms = new Map<string, Room>();

function genRoomId(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

/** slot → 客户端 owner 名（GameScene 8 槽位映射） */
export function ownerOfSlot(slot: number): string {
  return slot === 0 ? "player" : `ai${slot}`;
}

function makePlayer(ctx: Ctx, team: "A" | "B", slot: number, race: Race): RoomPlayer {
  return {
    uid: ctx.userId!,
    name: ctx.name!,
    team,
    slot,
    race: race ?? "terran",
    online: true,
    ctx,
  };
}

/** 分配最小可用 slot */
function allocSlot(room: Room): number {
  const used = new Set([...room.players.values()].map((p) => p.slot));
  for (let i = 0; i < 8; i++) if (!used.has(i)) return i;
  return -1;
}

function countOfTeam(room: Room, team: "A" | "B"): number {
  return [...room.players.values()].filter((p) => p.team === team).length;
}

/** 创建房间：建房者进 A 队占 slot0（即主机）。返回 room 或 null（已在房间） */
export function createRoom(ctx: Ctx, teamSize: number, race: Race): Room | null {
  if (ctx.room) return null;
  const room: Room = {
    id: genRoomId(),
    teamSize,
    players: new Map(), // uid -> player
    hostUid: ctx.userId!,
    createdAt: Date.now(),
    startedAt: 0, // 开战后写
    seed: 0,
    slots: [],
  };
  const p = makePlayer(ctx, "A", 0, race);
  room.players.set(p.uid, p);
  rooms.set(room.id, room);
  ctx.room = room;
  console.log(`[room] ${ctx.name} 创建房间 ${room.id}（${teamSize}v${teamSize}）`);
  broadcastRoomState(room);
  return room;
}

/** 加入房间：自动分到人少的队。成功返回 room，失败返回错误码 */
export function joinRoom(ctx: Ctx, roomId: string, race: Race): Room | number {
  if (ctx.room) return ERR.IN_ROOM;
  const room = rooms.get(roomId);
  if (!room) return ERR.NO_ROOM;
  if (room.startedAt > 0) return ERR.ROOM_STARTED;
  const countA = countOfTeam(room, "A");
  const countB = countOfTeam(room, "B");
  const team: "A" | "B" = countA <= countB ? "A" : "B";
  if ((team === "A" ? countA : countB) >= room.teamSize) return ERR.ROOM_FULL;
  const slot = allocSlot(room);
  if (slot < 0) return ERR.ROOM_FULL;
  const p = makePlayer(ctx, team, slot, race);
  room.players.set(p.uid, p);
  ctx.room = room;
  console.log(`[room] ${ctx.name} 加入 ${room.id}（${team}队 slot${slot}）`);
  broadcastRoomState(room);
  return room;
}

/** 离开房间（主动 or 断线且未开局）。返回 true 表示房间已解散或成员已移除 */
export function leaveRoom(ctx: Ctx, reason = "leave"): boolean {
  const room = ctx.room;
  if (!room) return false;
  const p = room.players.get(ctx.userId!);
  if (!p) return false;

  if (room.startedAt > 0) {
    // 已开局：不移除，标记离线，广播 player_left（战斗中处理见 battle_mgr）
    p.online = false;
    p.ctx = null;
    battle_mgr.onPlayerOffline(room, p, reason);
    ctx.room = null;
    return true;
  }

  room.players.delete(p.uid);
  ctx.room = null;
  console.log(`[room] ${ctx.name} 离开 ${room.id}`);
  if (room.players.size === 0) {
    rooms.delete(room.id);
    console.log(`[room] 房间 ${room.id} 空置解散`);
    return true;
  }
  // 房主离开则移交 slot 最小的成员
  if (room.hostUid === ctx.userId) {
    const next = [...room.players.values()].sort((a, b) => a.slot - b.slot)[0];
    room.hostUid = next.uid;
    console.log(`[room] 房主移交 ${next.name}`);
  }
  broadcastRoomState(room);
  return true;
}

/** 换阵营：目标队有空位才允许 */
export function setTeam(ctx: Ctx, team: "A" | "B"): boolean {
  const room = ctx.room;
  if (!room || room.startedAt > 0) return false;
  const p = room.players.get(ctx.userId!);
  if (!p || p.team === team) return false;
  if (countOfTeam(room, team) >= room.teamSize) return false;
  p.team = team;
  broadcastRoomState(room);
  return true;
}

/** 开始战斗校验：仅房主；A/B 人数都 == teamSize 才放行。成功返回 room，失败返回错误码 */
export function tryStart(ctx: Ctx): Room | number {
  const room = ctx.room;
  if (!room || room.startedAt > 0) return ERR.NOT_READY;
  if (room.hostUid !== ctx.userId) return ERR.NOT_HOST;
  if (countOfTeam(room, "A") !== room.teamSize || countOfTeam(room, "B") !== room.teamSize)
    return ERR.NOT_READY;
  // 槽位重排：房主固定 slot0（owner='player'），其余按 slot 升序占 ai1..
  const ordered = [...room.players.values()].sort((a, b) => {
    if (a.uid === room.hostUid) return -1;
    if (b.uid === room.hostUid) return 1;
    return a.slot - b.slot;
  });
  const slots: SlotInfo[] = ordered.map((p, i) => {
    p.slot = i;
    return {
      slot: i,
      owner: ownerOfSlot(i),
      team: p.team,
      race: p.race,
      uid: p.uid,
      name: p.name,
      hostUid: room.hostUid,
    };
  });
  room.startedAt = Date.now();
  room.seed = crypto.randomBytes(4).readUInt32LE(0);
  room.slots = slots;
  const startMsg = { type: MSG.START_GAME, seed: room.seed, slots };
  for (const p of room.players.values()) {
    if (p.online) p.ctx?.send(startMsg);
  }
  battle_mgr.beginBattle(room);
  console.log(
    `[room] ${room.id} 开战：${slots.map((s) => `${s.name}(${s.team}/${s.owner})`).join(", ")}`
  );
  return room;
}

/** 房间状态全员广播 */
export function broadcastRoomState(room: Room): void {
  const msg = {
    type: MSG.ROOM_STATE,
    roomId: room.id,
    teamSize: room.teamSize,
    players: [...room.players.values()].map((p) => ({
      uid: p.uid,
      name: p.name,
      team: p.team,
      slot: p.slot,
      race: p.race,
      online: p.online,
      host: p.uid === room.hostUid,
    })),
  };
  for (const p of room.players.values()) {
    if (p.online && p.ctx) p.ctx.send(msg);
  }
}

/** 房间列表（大厅用） */
export function listRooms() {
  return [...rooms.values()].map((r) => ({
    id: r.id,
    teamSize: r.teamSize,
    count: r.players.size,
    max: r.teamSize * 2,
    started: r.startedAt > 0,
  }));
}

/** 断线处理：开局后标记离线并广播；未开局按离开处理 */
export function handleDisconnect(ctx: Ctx): void {
  if (!ctx.room) return;
  leaveRoom(ctx, "disconnect");
}

/** 按 uid 查在线 ctx（battle 转发用；在线表直查） */
export function ctxOf(uid: number): Ctx | null {
  const ctx = onlineCtx.get(uid);
  return ctx && ctx.userId === uid ? ctx : null;
}
