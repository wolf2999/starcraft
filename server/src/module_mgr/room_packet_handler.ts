/** 房间类消息处理器：auth/create/join/leave/list/set_team/start + 战斗转发入口 */
import { MSG, ERR } from "../common/packet";
import type { Msg } from "../common/packet";
import type { Ctx, Race } from "../types";
import * as module_mgr from "./module_mgr";
import * as user_mgr from "./user_mgr";
import * as room_mgr from "./room_mgr";
import * as battle_mgr from "./battle_mgr";

const RACES: Race[] = ["terran", "protoss", "zerg"];

const ERR_TEXT: Record<number, string> = {
  [ERR.NOT_AUTH]: "未登录",
  [ERR.PARAM]: "参数错误",
  [ERR.NO_ROOM]: "房间不存在",
  [ERR.ROOM_FULL]: "房间已满",
  [ERR.IN_ROOM]: "已在房间中",
  [ERR.ROOM_STARTED]: "对局已开始",
  [ERR.TEAM_FULL]: "阵营已满",
  [ERR.NOT_HOST]: "仅房主可操作",
  [ERR.NOT_READY]: "人数未对等",
  [ERR.NOT_IN_BATTLE]: "不在对局中",
  [ERR.FORBIDDEN]: "无权限",
};

function errText(code: number): string {
  return ERR_TEXT[code] ?? "操作失败";
}

module_mgr.registerHandlers({
  /** 登录鉴权：{token} → auth_ok{userId,name} */
  [MSG.AUTH]: (ctx: Ctx, msg: Msg) => {
    const info = user_mgr.verifyToken(msg.token);
    if (!info) return ctx.sendError("token 无效或过期", ERR.NOT_AUTH);
    // 踢重复登录：旧连接收到 kicked 后关闭
    const old = user_mgr.setOnline(info.userId, ctx);
    if (old && old !== ctx) {
      old.send({ type: MSG.KICKED, msg: "账号在其他窗口登录" });
      old.socket.close();
    }
    // 旧连接可能还占着房间
    if (old && old.room) {
      old.room = null;
    }
    ctx.userId = info.userId;
    ctx.name = info.name;
    ctx.send({ type: MSG.AUTH_OK, userId: info.userId, name: info.name });
    console.log(`[ws] auth 通过 uid=${info.userId} ${info.name}`);
  },

  /** 创建房间：{teamSize:1|2|3|4, race} → room_state 广播 */
  [MSG.CREATE_ROOM]: (ctx: Ctx, msg: Msg) => {
    if (ctx.room) return ctx.sendError("已在房间中", ERR.IN_ROOM);
    const teamSize = msg.teamSize | 0;
    if (![1, 2, 3, 4].includes(teamSize)) return ctx.sendError("teamSize 须为 1~4", ERR.PARAM);
    const race: Race = RACES.includes(msg.race) ? msg.race : "terran";
    const room = room_mgr.createRoom(ctx, teamSize, race);
    if (!room) ctx.sendError("创建失败", ERR.IN_ROOM);
  },

  /** 加入房间：{roomId, race} → room_state 广播 */
  [MSG.JOIN_ROOM]: (ctx: Ctx, msg: Msg) => {
    if (typeof msg.roomId !== "string") return ctx.sendError("参数缺失", ERR.PARAM);
    const race: Race = RACES.includes(msg.race) ? msg.race : "terran";
    const ret = room_mgr.joinRoom(ctx, msg.roomId, race);
    // joinRoom 成功返回房间对象、失败返回错误码
    if (typeof ret !== "object") ctx.sendError(errText(ret), ret);
  },

  /** 离开房间：{} → room_state 广播（其余成员） */
  [MSG.LEAVE_ROOM]: (ctx: Ctx) => {
    room_mgr.leaveRoom(ctx, "leave");
  },

  /** 房间列表：{} → room_list */
  [MSG.LIST_ROOM]: (ctx: Ctx) => {
    ctx.send({ type: MSG.ROOM_LIST, rooms: room_mgr.listRooms() });
  },

  /** 换阵营：{team:"A"|"B"} → room_state 广播 */
  [MSG.SET_TEAM]: (ctx: Ctx, msg: Msg) => {
    if (msg.team !== "A" && msg.team !== "B") return ctx.sendError("参数缺失", ERR.PARAM);
    if (!room_mgr.setTeam(ctx, msg.team)) {
      ctx.sendError("换阵营失败（满员或未进房）", ERR.TEAM_FULL);
    }
  },

  /** 开始战斗：{} 仅房主；对等校验 → start_game */
  [MSG.START]: (ctx: Ctx) => {
    const ret = room_mgr.tryStart(ctx);
    if (typeof ret === "number") {
      ctx.sendError(errText(ret), ret);
    }
  },

  /** 指令（非主机发）：{roomId, seq, cmd} → 主机 */
  [MSG.CMD]: (ctx: Ctx, msg: Msg) => {
    const ret = battle_mgr.forwardCmd(ctx, msg);
    if (ret !== true) ctx.sendError(errText(ret), ret);
  },

  /** 快照（主机发）：{roomId, tick, ents} → 其余成员 */
  [MSG.SNAPSHOT]: (ctx: Ctx, msg: Msg) => {
    const ret = battle_mgr.forwardSnapshot(ctx, msg);
    if (ret !== true) ctx.sendError(errText(ret), ret);
  },

  /** 结束战斗（主机发）：{winner} → 落库 + game_over 广播 */
  [MSG.GAME_OVER]: (ctx: Ctx, msg: Msg) => {
    const ret = battle_mgr.gameOver(ctx, msg as unknown as { winner: "A" | "B" | "draw" });
    if (ret !== true) ctx.sendError(errText(ret), ret);
  },
});
