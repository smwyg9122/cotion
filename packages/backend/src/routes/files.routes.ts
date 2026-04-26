import { Router } from 'express';
import multer from 'multer';
import { filesController } from '../controllers/files.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// 허용 파일 타입
const ALLOWED_MIME_TYPES = [
  // 이미지
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // 문서
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // 텍스트
  'text/plain', 'text/csv',
  // 압축
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`허용되지 않는 파일 형식입니다: ${file.mimetype}`));
    }
  },
});

// Upload requires authentication
router.post('/upload', authMiddleware, upload.single('file'), filesController.upload);

// Download is public (이미지가 <img src>로 직접 참조되므로 인증 불가)
router.get('/:id', filesController.download);

export default router;
