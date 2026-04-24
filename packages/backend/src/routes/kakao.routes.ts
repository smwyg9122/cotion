import { Router } from 'express';
import { kakaoController } from '../controllers/kakao.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/auth-url', authMiddleware, kakaoController.getAuthUrl);
router.post('/callback', authMiddleware, kakaoController.handleCallback);
router.get('/status', authMiddleware, kakaoController.getStatus);
router.post('/unlink', authMiddleware, kakaoController.unlink);
router.post('/test', authMiddleware, kakaoController.testMessage);

export default router;
