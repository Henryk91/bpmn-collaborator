/** Application constants. */

const DEFAULT_API_URL = '';

export const API_URL = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL;

export const WS_URL = API_URL
  .replace('http://', 'ws://')
  .replace('https://', 'wss://');

export const WEBSOCKET_RECONNECT_DELAY = 3000;
export const DIAGRAM_UPDATE_DEBOUNCE_MS = 200;

export const MESSAGE_TYPES = {
  DIAGRAM_STATE: 'diagram_state',
  DIAGRAM_UPDATE: 'diagram_update',
  ELEMENT_LOCK: 'element_lock',
  ELEMENT_UNLOCK: 'element_unlock',
  ELEMENT_LOCKED: 'element_locked',
  ELEMENT_UNLOCKED: 'element_unlocked',
  USER_LIST: 'user_list',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  LOCKS_UPDATE: 'locks_update',
  PING: 'ping',
  PONG: 'pong',
} as const;
