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
    // 웹(env로 지정된 Vercel·로컬) + 네이티브 앱(Capacitor) origin을 모두 허용.
    // 배열로 두면 cors 미들웨어는 배열을 그대로 처리하고,
    // csrf 미들웨어의 String(origin).split(',')도 동일하게 복원되어 양쪽이 호환된다.
    origin: [
      ...(process.env.CORS_ORIGIN || 'http://localhost:5173')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      'https://localhost', // Capacitor Android (androidScheme: 'https')
      'capacitor://localhost', // Capacitor iOS
    ],
    credentials: true,
  },
};
