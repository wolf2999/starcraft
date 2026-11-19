/** 服务器入口（仿 chaos main.js）：初始化 DB → 起 HTTP → 起 WS → 注册模块 */
import * as db from "./db/mysql";
import * as http_server from "./http_server";
import * as ws_server from "./ws_server";

// 模块在 import 时即向 module_mgr 注册处理器
import "./module_mgr/room_packet_handler";
import "./module_mgr/battle_mgr";

(async () => {
  try {
    await db.init();
    console.log("[db] MySQL 初始化完成");
  } catch (err: any) {
    console.error("[db] MySQL 初始化失败（检查 config.json 与 MySQL 服务）:", err.message);
    process.exit(1);
  }
  await http_server.listen();
  ws_server.listen();
  console.log("server ready");
})().catch((err) => {
  console.error("启动失败:", err);
  process.exit(1);
});
