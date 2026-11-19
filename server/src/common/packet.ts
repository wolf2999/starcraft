/** 协议消息 type 常量与错误码（JSON 文本帧） */

export const MSG = {
  // C→S
  AUTH: "auth",
  CREATE_ROOM: "create_room",
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",
  LIST_ROOM: "list_room",
  SET_TEAM: "set_team",
  START: "start",
  CMD: "cmd",
  SNAPSHOT: "snapshot",
  GAME_OVER: "game_over",
  // S→C
  AUTH_OK: "auth_ok",
  ROOM_LIST: "room_list",
  ROOM_STATE: "room_state",
  START_GAME: "start_game",
  CMD_FROM: "cmd_from",
  SNAPSHOT_TO: "snapshot_to",
  PLAYER_LEFT: "player_left",
  KICKED: "kicked",
  ERROR: "error",
} as const;

export const ERR = {
  NOT_AUTH: 100,
  PARAM: 101,
  NO_ROOM: 102,
  ROOM_FULL: 103,
  IN_ROOM: 104,
  ROOM_STARTED: 105,
  TEAM_FULL: 106,
  NOT_HOST: 107,
  NOT_READY: 108,
  NOT_IN_BATTLE: 109,
  FORBIDDEN: 110,
} as const;

/** 任意一条客户端/服务器消息（type 必有，其余字段按 type 解析） */
export interface Msg {
  type: string;
  [key: string]: any;
}
