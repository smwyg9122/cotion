import { Router } from 'express';
import multer from 'multer';
import { filesController } from '../controllers/files.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// Upload requires authentication
router.post('/upload', authMiddleware, upload.single('file'), filesController.upload);

// Download is public (이미지가 <img src>로 직접 참조되므로 인증 불가)
router.get('/:id', filesController.download);

export default router;
