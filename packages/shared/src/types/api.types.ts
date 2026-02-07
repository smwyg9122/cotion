export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

export interface PresenceUpdate {
  userId: string;
  userName: string;
  pageId: string;
  cursorPosition?: {
    line: number;
    column: number;
  };
  color: string;
}
