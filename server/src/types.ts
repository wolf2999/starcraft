/** 全局共享类型：连接上下文 / 房间 / 玩家 / 槽位（纯类型，无运行时代码）
 * 独立成文件避免 ws_server ↔ room_mgr ↔ battle_mgr 的循环依赖 */
import type { WebSocket } from "ws";

/** 种族（与客户端 config.ts 的 Race 一致） */
export type Race = "terran" | "protoss" | "zerg";

/** 房间内成员 */
export interface RoomPlayer {
  uid: number;
  name: string;
  team: "A" | "B";
  slot: number;
  race: Race;
  online: boolean;
  /** 在线连接；离线后置 null */
  ctx: Ctx | null;
}

/** 开局槽位（start_game 下发；slot0=主机=owner "player"，其余 "ai1".."ai7"） */
export interface SlotInfo {
  slot: number;
  owner: string;
  team: "A" | "B";
  race: Race;
  uid: number;
  name: string;
  hostUid: number;
}

/** 房间（纯内存，不持久化） */
export interface Room {
  id: string;
  teamSize: number;
  players: Map<number, RoomPlayer>;
  hostUid: number;
  createdAt: number;
  /** >0 表示已开局 */
  startedAt: number;
  seed: number;
  /** 开战时写入（tryStart 填充） */
  slots: SlotInfo[];
}

/** 连接上下文：一个 ws 连接一个 ctx，auth 后绑定 userId */
export interface Ctx {
  socket: WebSocket;
  userId: number | null;
  name: string | null;
  /** 当前所在房间（room_mgr 维护） */
  room: Room | null;
  send(obj: Record<string, unknown>): void;
  sendError(msg: string, code?: number): void;
}
