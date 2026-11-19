/** HTTP 服务：注册/登录接口（仿 chaos http_server.js：原生 http + 路由表） */
import * as http from "http";
import * as user_dao from "./db/user_dao";
import * as user_mgr from "./module_mgr/user_mgr";
import cfg from "./config";

type RouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  body: Record<string, any>
) => Promise<void>;

function sendJson(res: http.ServerResponse, code: number, obj: Record<string, unknown>): void {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

const handleRegister: RouteHandler = async (_req, res, body) => {
  const { username, password } = body;
  if (typeof username !== "string" || !/^[A-Za-z0-9_\u4e00-\u9fa5]{2,16}$/.test(username)) {
    return sendJson(res, 200, { code: 1, msg: "用户名需 2~16 位字母/数字/下划线/中文" });
  }
  if (typeof password !== "string" || password.length < 4 || password.length > 32) {
    return sendJson(res, 200, { code: 2, msg: "密码需 4~32 位" });
  }
  const userId = await user_dao.register(username, password);
  if (userId == null) {
    return sendJson(res, 200, { code: 3, msg: "用户名已存在" });
  }
  console.log(`[http] 注册成功: ${username} -> uid=${userId}`);
  sendJson(res, 200, { code: 0, userId });
};

const handleLogin: RouteHandler = async (_req, res, body) => {
  const { username, password } = body;
  if (typeof username !== "string" || typeof password !== "string") {
    return sendJson(res, 200, { code: 1, msg: "参数缺失" });
  }
  const user = await user_dao.login(username, password);
  if (!user) {
    return sendJson(res, 200, { code: 4, msg: "用户名或密码错误" });
  }
  const token = user_mgr.issueToken(user.id, user.username);
  console.log(`[http] 登录成功: ${username} uid=${user.id}`);
  sendJson(res, 200, {
    code: 0,
    token,
    userId: user.id,
    username: user.username,
    wins: user.wins,
    losses: user.losses,
  });
};

const routes: Record<string, RouteHandler> = {
  "/api/register": handleRegister,
  "/api/login": handleLogin,
};

const server = http.createServer((req, res) => {
  // CORS 预检
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }
  const route = routes[req.url!.split("?")[0]];
  if (!route) return sendJson(res, 404, { code: 404, msg: "not found" });

  let data = "";
  req.on("data", (c) => {
    data += c;
    if (data.length > 1e6) req.destroy();
  });
  req.on("end", async () => {
    let body: Record<string, any> = {};
    try {
      body = data ? JSON.parse(data) : {};
    } catch {
      return sendJson(res, 200, { code: 1, msg: "JSON 解析失败" });
    }
    try {
      await route(req, res, body);
    } catch (err) {
      console.error("[http] 处理出错:", err);
      sendJson(res, 500, { code: 500, msg: "服务器内部错误" });
    }
  });
});

export function listen(): Promise<void> {
  return new Promise((resolve) => {
    server.listen(cfg.httpPort, () => {
      console.log(`[http] 监听 :${cfg.httpPort}`);
      resolve();
    });
  });
}
