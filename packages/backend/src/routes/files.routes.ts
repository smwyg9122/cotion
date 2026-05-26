import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { filesController } from '../controllers/files.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

/**
 * Per-IP download limiter to make UUID-enumeration attacks impractical.
 * The download endpoint is intentionally unauthenticated so that <img src>
 * tags work — but UUIDv4 has ~122 bits of entropy, and this limiter caps
 * any brute-force attempt to a trivial throughput.
 */
const downloadLimiter = rateLimit({
  windowMs: 60 * 1000,    // 1 minute
  max: 200,                // 200 file requests/min/IP — generous for a page with many images
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: '파일 요청이 너무 많습니다.' },
  },
});

// Upload requires authentication
router.post('/upload', authMiddleware, upload.single('file'), filesController.upload);

// Download is intentionally public so that <img src="/api/files/:uuid"> works
// in browsers (they cannot send Authorization headers on image requests).
// Protection model:
//   - File IDs are UUIDv4 (~122 bits of entropy) — not enumerable
//   - downloadLimiter blocks IP-level abuse
//   - No directory listing endpoint exists
// If a stronger guarantee is needed, switch to signed URLs (short-lived HMAC).
router.get('/:id', downloadLimiter, filesController.download);

export default router;
