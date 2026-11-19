/** WS 服务：消息统一入口按 type 分发；维护连接上下文（uid↔socket） */
import { WebSocketServer, WebSocket } from "ws";
import cfg from "./config";
import { MSG } from "./common/packet";
import type { Msg } from "./common/packet";
import type { Ctx } from "./types";
import * as module_mgr from "./module_mgr/module_mgr";
import * as user_mgr from "./module_mgr/user_mgr";
import * as room_mgr from "./module_mgr/room_mgr";

const wss = new WebSocketServer({ port: cfg.wsPort });

export function listen(): Promise<void> {
  return new Promise((resolve) => {
    wss.on("listening", () => {
      console.log(`[ws] 监听 :${cfg.wsPort}`);
      resolve();
    });
  });
}

/** 连接上下文：一个 ws 连接一个 ctx，auth 后绑定 userId */
function makeCtx(socket: WebSocket): Ctx {
  const ctx: Ctx = {
    socket,
    userId: null,
    name: null,
    room: null, // 加入的房间对象（room_mgr 维护）
    send(obj) {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(obj));
    },
    sendError(msg, code = -1) {
      ctx.send({ type: MSG.ERROR, code, msg });
    },
  };
  return ctx;
}

wss.on("connection", (socket) => {
  const ctx = makeCtx(socket);
  console.log(`[ws] 连接建立（当前 ${wss.clients.size} 个）`);

  socket.on("message", (raw) => {
    let msg: Msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return ctx.sendError("JSON 解析失败");
    }
    if (!msg || typeof msg.type !== "string") {
      return ctx.sendError("缺少 type 字段");
    }
    // auth 之外的接口要求先完成鉴权
    if (msg.type !== MSG.AUTH && !ctx.userId) {
      return ctx.sendError("未登录", 100);
    }
    module_mgr.dispatch(ctx, msg);
  });

  socket.on("close", () => {
    console.log(`[ws] 连接断开 uid=${ctx.userId ?? "-"}`);
    room_mgr.handleDisconnect(ctx);
    if (ctx.userId != null) user_mgr.setOffline(ctx.userId, ctx);
  });

  socket.on("error", (err) => {
    console.error("[ws] socket 错误:", err.message);
  });
});
