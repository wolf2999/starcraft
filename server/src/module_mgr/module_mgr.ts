/** 消息模块注册中心（仿 chaos SystemCenter.subscribeMessage：{type: handler} 注册表）
 * handler(ctx, msg) —— ctx 为连接上下文（socket + userId 等），msg 为解码后的 JSON */
import type { Ctx } from "../types";
import type { Msg } from "../common/packet";

export type Handler = (ctx: Ctx, msg: Msg) => void;

const handlers: Record<string, Handler> = {};

/** 注册一批处理器：registerHandlers({ create_room: fn, ... }) */
export function registerHandlers(map: Record<string, Handler>): void {
  for (const [type, fn] of Object.entries(map)) {
    if (handlers[type]) {
      console.warn(`[module_mgr] handler 重复注册被覆盖: ${type}`);
    }
    handlers[type] = fn;
  }
}

/** 分发一条消息：未知类型回 error */
export function dispatch(ctx: Ctx, msg: Msg): void {
  const fn = handlers[msg.type];
  if (!fn) {
    ctx.sendError(`未知消息类型: ${msg.type}`);
    return;
  }
  try {
    fn(ctx, msg);
  } catch (err) {
    console.error(`[module_mgr] 处理 ${msg.type} 出错:`, err);
    ctx.sendError("服务器内部错误");
  }
}
