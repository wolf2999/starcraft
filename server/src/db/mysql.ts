/** MySQL 连接池 + 建库建表（仿 chaos db 层：统一入口，业务只管 SQL） */
import * as mysql from "mysql2/promise";
import cfg from "../config";

let pool: mysql.Pool | null = null;

/** 获取连接池（首次调用时创建） */
export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: cfg.mysql.host,
      port: cfg.mysql.port,
      user: cfg.mysql.user,
      password: cfg.mysql.password,
      database: cfg.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      charset: "utf8mb4",
    });
  }
  return pool;
}

/** 启动时初始化：先连不带库名建库，再建表 */
export async function init(): Promise<void> {
  // 建库（连接时不带 database，避免库不存在连不上）
  const boot = await mysql.createConnection({
    host: cfg.mysql.host,
    port: cfg.mysql.port,
    user: cfg.mysql.user,
    password: cfg.mysql.password,
    charset: "utf8mb4",
  });
  await boot.query(
    `CREATE DATABASE IF NOT EXISTS \`${cfg.mysql.database}\` DEFAULT CHARACTER SET utf8mb4`
  );
  await boot.end();

  // 建表
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS users(
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(32) NOT NULL UNIQUE,
      password_hash CHAR(64) NOT NULL,
      salt CHAR(16) NOT NULL,
      wins INT DEFAULT 0,
      losses INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    ) CHARSET utf8mb4`);
  await p.query(`
    CREATE TABLE IF NOT EXISTS battles(
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      room_id VARCHAR(16),
      team_size TINYINT,
      team_a JSON,
      team_b JSON,
      winner ENUM('A','B','draw'),
      started_at DATETIME,
      ended_at DATETIME,
      duration_sec INT
    ) CHARSET utf8mb4`);
}

/** 查询单条：返回第一行或 null（行结构按 SQL 自行断言） */
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const [rows] = await getPool().query(sql, params);
  return (rows as T[])[0] ?? null;
}

/** 执行写语句：返回 {insertId, affectedRows} */
export async function execute(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
  const [ret] = await getPool().execute(sql, params);
  return ret as mysql.ResultSetHeader;
}
