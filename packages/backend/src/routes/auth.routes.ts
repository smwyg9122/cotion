import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { csrfGuard } from '../middleware/csrf.middleware';

const router = Router();

// Brute-force protection. `trust proxy` is already set in server.ts so
// req.ip reflects the real client behind Railway/Vercel.
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,          // 1 minute
  max: 10,                       // 10 attempts/min/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: '너무 많은 로그인 시도입니다. 잠시 후 다시 시도해주세요.',
    },
  },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,      // 1 hour
  max: 5,                         // 5 signups/hour/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: '회원가입 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.',
    },
  },
});

const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,           // 1 minute
  max: 60,                        // 60 refreshes/min/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: '요청이 너무 잦습니다.',
    },
  },
});

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: '비밀번호 변경 시도가 너무 많습니다.',
    },
  },
});

router.post('/signup', signupLimiter, authController.signup);
router.post('/login', loginLimiter, authController.login);
// logout + refresh use the httpOnly refresh cookie, so they're the only
// auth endpoints that need CSRF protection. login/signup take credentials
// in the body so a hostile site can't replay them silently.
router.post('/logout', csrfGuard, authController.logout);
router.post('/refresh', csrfGuard, refreshLimiter, authController.refresh);
router.get('/me', authMiddleware, authController.me);
router.put('/me', authMiddleware, authController.updateMe);
router.get('/users', authMiddleware, authController.getUsers);
router.post('/change-password', authMiddleware, passwordChangeLimiter, authController.changePassword);

export default router;
