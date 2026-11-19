/** config.json 读取单例（仿 chaos config 模块：进程内只读一次）
 * 路径按 __dirname 上溯：dist/config.js → server/config.json，src/config.ts → server/config.json 均正确 */
import * as fs from "fs";
import * as path from "path";

export interface MysqlConf {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface Config {
  httpPort: number;
  wsPort: number;
  mysql: MysqlConf;
  tokenExpireSec: number;
  maxRoomPlayers: number;
}

const cfg: Config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "config.json"), "utf8")
);

export default cfg;
