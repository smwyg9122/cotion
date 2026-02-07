export const JWT_ACCESS_EXPIRY = '15m';
export const JWT_REFRESH_EXPIRY = '7d';

export const USER_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export const API_ERRORS = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFLICT: 'CONFLICT',
} as const;

export const WS_EVENTS = {
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',
  CURSOR_MOVE: 'cursor:move',
  USER_TYPING: 'user:typing',
  PAGE_UPDATE: 'page:update',
} as const;
