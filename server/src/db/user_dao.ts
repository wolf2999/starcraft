/** 用户 DAO：users 增查、battles 战报写入 */
import * as crypto from "crypto";
import * as db from "./mysql";

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  salt: string;
  wins: number;
  losses: number;
}

export interface BattleRecord {
  roomId: string;
  teamSize: number;
  teamA: number[];
  teamB: number[];
  winner: "A" | "B" | "draw";
  startedAt: number;
  endedAt: number;
}

/** 生成随机盐（16 位十六进制） */
export function genSalt(): string {
  return crypto.randomBytes(8).toString("hex");
}

/** 密码哈希：sha256(password + salt) 十六进制 64 位 */
export function hashPassword(password: string, salt: string): string {
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}

/** 注册：成功返回 userId；用户名已存在返回 null */
export async function register(username: string, password: string): Promise<number | null> {
  const exist = await db.queryOne("SELECT id FROM users WHERE username=?", [username]);
  if (exist) return null;
  const salt = genSalt();
  const hash = hashPassword(password, salt);
  const ret = await db.execute(
    "INSERT INTO users(username, password_hash, salt) VALUES(?,?,?)",
    [username, hash, salt]
  );
  return Number(ret.insertId);
}

/** 登录校验：成功返回用户行并刷新 last_login；失败返回 null */
export async function login(username: string, password: string): Promise<UserRow | null> {
  const user = await db.queryOne<UserRow>("SELECT * FROM users WHERE username=?", [username]);
  if (!user) return null;
  if (hashPassword(password, user.salt) !== user.password_hash) return null;
  await db.execute("UPDATE users SET last_login=NOW() WHERE id=?", [user.id]);
  return user;
}

/** 按 id 查用户（auth 后取名字/战绩用） */
export async function getById(id: number) {
  return db.queryOne<{ id: number; username: string; wins: number; losses: number }>(
    "SELECT id, username, wins, losses FROM users WHERE id=?",
    [id]
  );
}

/** 战报落库 + 胜负计入战绩（draw 不动） */
export async function recordBattle(b: BattleRecord): Promise<void> {
  const durationSec = Math.max(0, Math.floor((b.endedAt - b.startedAt) / 1000));
  await db.execute(
    "INSERT INTO battles(room_id, team_size, team_a, team_b, winner, started_at, ended_at, duration_sec) VALUES(?,?,?,?,?,?,?,?)",
    [
      b.roomId,
      b.teamSize,
      JSON.stringify(b.teamA),
      JSON.stringify(b.teamB),
      b.winner,
      new Date(b.startedAt),
      new Date(b.endedAt),
      durationSec,
    ]
  );
  if (b.winner === "A" || b.winner === "B") {
    const winners = b.winner === "A" ? b.teamA : b.teamB;
    const losers = b.winner === "A" ? b.teamB : b.teamA;
    for (const uid of winners) {
      await db.execute("UPDATE users SET wins=wins+1 WHERE id=?", [uid]);
    }
    for (const uid of losers) {
      await db.execute("UPDATE users SET losses=losses+1 WHERE id=?", [uid]);
    }
  }
}
