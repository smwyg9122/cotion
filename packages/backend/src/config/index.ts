import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  wsPort: parseInt(process.env.WS_PORT || '1234', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cotion_dev',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'your-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    // Access token kept short so a leaked token's blast radius is bounded.
    // Frontend has /refresh on 401, so the UX impact is invisible.
    // Refresh token is stored in DB sessions table; we rely on session lookup
    // for revocation. Rotation/reuse-detection is a TODO (separate work).
    accessExpiry: '1h' as const,
    refreshExpiry: '7d' as const,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
};
