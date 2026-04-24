import { Router } from 'express';
import multer from 'multer';
import { filesController } from '../controllers/files.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// Upload requires authentication
router.post('/upload', authMiddleware, upload.single('file'), filesController.upload);

// Download is public (anyone with the URL can access)
router.get('/:id', filesController.download);

export default router;
