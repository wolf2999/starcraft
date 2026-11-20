/**
 * 战网客户端：HTTP 注册/登录 + WebSocket 房间/对局通道。
 *
 * - 地址由页面主机名推导（本机开发即 127.0.0.1；局域网对战时服务器侧同主机名可达）。
 * - 服务器协议见 server/src/common/packet.js；本模块做轻类型封装：
 *   各消息类型通过 setHandler 单播给当前场景（MenuScene / GameScene 各管各的）。
 */
import type { Race } from "../config";

export const NET_HTTP_PORT = 8100;
export const NET_WS_PORT = 8101;
/** 连接入口：优先 VITE_NET_HOST 构建变量（前端发布到 Workers 等外部托管时，页面主机名≠服务器地址）。
 * 支持两种写法：完整 origin（如 https://xxx.trycloudflare.com，https 自动转 wss）或裸主机名；
 * 本地开发不设置，由页面主机名推导（本机开发即 127.0.0.1）。
 * 注意：完整 origin 模式要求服务器入口有路径分流（/api/* → 8100，其余/WS → 8101），见 Mac 侧 proxy.mjs。 */
const rawNetHost =
  (import.meta.env?.VITE_NET_HOST as string | undefined)?.trim() ||
  (typeof location !== "undefined" ? location.hostname || "127.0.0.1" : "127.0.0.1");
const isOriginForm = /^https?:\/\//i.test(rawNetHost);
export const NET_HTTP_BASE = isOriginForm ? rawNetHost : `http://${rawNetHost}:${NET_HTTP_PORT}`;
export const NET_WS_URL = isOriginForm ? rawNetHost.replace(/^http/i, "ws") : `ws://${rawNetHost}:${NET_WS_PORT}`;

/** 房间成员（room_state.players 项） */
export interface RoomPlayer {
  uid: number;
  name: string;
  team: "A" | "B";
  slot: number;
  race: Race;
  online: boolean;
  host: boolean;
}

/** 房间状态广播 */
export interface RoomStateMsg {
  type: "room_state";
  roomId: string;
  teamSize: number;
  players: RoomPlayer[];
}

/** 开局槽位（slot ↔ GameScene owner：slot0=player，其余 ai1..ai7） */
export interface SlotInfo {
  slot: number;
  owner: string;
  team: "A" | "B";
  race: Race;
  uid: number;
  name: string;
  hostUid: number;
}

export interface StartGameMsg {
  type: "start_game";
  seed: number;
  slots: SlotInfo[];
}

/** 房间列表项 */
export interface RoomListItem {
  id: string;
  teamSize: number;
  count: number;
  max: number;
  started: boolean;
}

/** 服务器错误消息 */
export interface ErrorMsg {
  type: "error";
  code: number;
  msg: string;
}

/** 快照实体（精简字段；flags 位：1 已完工 / 2 攻城 / 4 隐形 / 8 携带资源） */
export interface SnapEnt {
  id: number;
  defId: string;
  owner: string;
  x: number;
  y: number;
  hp: number;
  shield: number;
  en?: number;
  flags?: number;
  buildProgress?: number;
}

/** 战报记录（game_over 广播） */
export interface GameOverMsg {
  type: "game_over";
  winner: "A" | "B" | "draw";
  reason?: "disconnect";
  records?: Record<string, { team: string; winner: boolean }>;
}

type Handler = (msg: any) => void;

/** HTTP POST JSON */
function httpPost(path: string, body: Record<string, unknown>): Promise<any> {
  return fetch(`${NET_HTTP_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

class NetClient {
  token = "";
  userId = 0;
  username = "";
  wins = 0;
  losses = 0;

  private ws: WebSocket | null = null;
  /** 每种消息类型一个处理器（场景切换时整体替换） */
  private handlers: Record<string, Handler> = {};

  connected = false;
  /** 主机最近一次快照缓存：镜像端场景未就绪（隐藏 tab RAF 冻结、create 未跑）期间
   * 到达的快照不会丢——GameScene create 注册处理器后立即补放，开局必有实体 */
  lastSnapshot: { tick: number; ents: SnapEnt[]; res?: any; supply?: any } | null = null;

  /** 设置某消息类型处理器（覆盖式） */
  setHandler(type: string, fn: Handler) {
    this.handlers[type] = fn;
  }

  /** 清空全部处理器（切场景时调用） */
  clearHandlers() {
    this.handlers = {};
  }

  /** 注册账号：code 0 成功 */
  register(username: string, password: string) {
    return httpPost("/api/register", { username, password });
  }

  /** 登录：code 0 成功并持有 token（供 ws auth 用） */
  login(username: string, password: string) {
    return httpPost("/api/login", { username, password }).then((r) => {
      if (r.code === 0) {
        this.token = r.token;
        this.userId = r.userId;
        this.username = r.username;
        this.wins = r.wins ?? 0;
        this.losses = r.losses ?? 0;
      }
      return r;
    });
  }

  /** 建立 WS 连接并完成 auth；resolve=auth_ok，reject=连接失败或 auth 被拒 */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(NET_WS_URL);
      this.ws = ws;
      const fail = (err: string) => {
        if (!settled) {
          settled = true;
          reject(new Error(err));
        }
      };
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "auth", token: this.token }));
      };
      ws.onerror = () => fail("连接服务器失败");
      ws.onclose = () => {
        this.connected = false;
        fail("连接已关闭");
        // 已建链后掉线：通知当前场景
        this.handlers["_close"]?.({});
      };
      ws.onmessage = (ev) => {
        let msg: any;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type === "auth_ok") {
          this.connected = true;
          if (!settled) {
            settled = true;
            resolve();
          }
          return;
        }
        // 快照先入缓存再分发：处理器未注册期间（镜像场景加载中）也不丢
        if (msg.type === "snapshot_to") this.lastSnapshot = msg;
        this.handlers[msg.type]?.(msg);
      };
    });
  }

  private send(obj: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  createRoom(teamSize: number, race: Race) {
    this.send({ type: "create_room", teamSize, race });
  }
  joinRoom(roomId: string, race: Race) {
    this.send({ type: "join_room", roomId, race });
  }
  leaveRoom() {
    this.send({ type: "leave_room" });
  }
  listRooms() {
    this.send({ type: "list_room" });
  }
  setTeam(team: "A" | "B") {
    this.send({ type: "set_team", team });
  }
  start() {
    this.send({ type: "start" });
  }

  /** 非主机发指令（主机本端直接执行，不经网络） */
  cmd(seq: number, cmd: Record<string, unknown>) {
    this.send({ type: "cmd", seq, cmd });
  }

  /** 主机广播全量快照（资源/人口桶一并下发供镜像端 HUD） */
  snapshot(
    tick: number,
    ents: SnapEnt[],
    res: Record<string, { m: number; v: number }>,
    supply: Record<string, { p: number; u: number }>
  ) {
    this.send({ type: "snapshot", tick, ents, res, supply });
  }

  /** 主机宣布对局结束 */
  gameOver(winner: "A" | "B" | "draw") {
    this.send({ type: "game_over", winner });
  }

  /** 主动断开（回主菜单时） */
  disconnect() {
    this.handlers = {};
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }
}

export const net = new NetClient();
