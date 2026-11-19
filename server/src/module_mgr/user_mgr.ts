/** 用户/令牌管理：token 签发与校验、在线表、重复登录踢下线 */
import * as crypto from "crypto";
import cfg from "../config";
import type { Ctx } from "../types";

interface TokenInfo {
  userId: number;
  name: string;
  expireAt: number;
}

/** token -> { userId, name, expireAt } */
const tokens = new Map<string, TokenInfo>();
/** userId -> ctx（在线连接；供踢重复登录与广播定位） */
export const onlineCtx = new Map<number, Ctx>();

/** 签发 token（登录成功后调用） */
export function issueToken(userId: number, name: string): string {
  const token = crypto.randomBytes(16).toString("hex");
  tokens.set(token, {
    userId,
    name,
    expireAt: Date.now() + cfg.tokenExpireSec * 1000,
  });
  return token;
}

/** 校验 token：有效返回 {userId, name}，否则 null（过期即清除） */
export function verifyToken(token: string): TokenInfo | null {
  const info = tokens.get(token);
  if (!info) return null;
  if (Date.now() > info.expireAt) {
    tokens.delete(token);
    return null;
  }
  return info;
}

/** 连接完成 auth 后登记在线表；若该用户已有旧连接则踢掉（返回被踢的旧 ctx） */
export function setOnline(userId: number, ctx: Ctx): Ctx | null {
  const old = onlineCtx.get(userId);
  onlineCtx.set(userId, ctx);
  return old ?? null;
}

export function setOffline(userId: number, ctx: Ctx): void {
  // 只在当前映射还是这条连接时才移除（防踢旧连接时误删新连接）
  if (onlineCtx.get(userId) === ctx) onlineCtx.delete(userId);
}

export function isOnline(userId: number): boolean {
  return onlineCtx.has(userId);
}
