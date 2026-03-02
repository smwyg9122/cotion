import { Router } from 'express';
import { commentsController } from '../controllers/comments.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/:pageId', commentsController.getByPage);
router.post('/:pageId', commentsController.create);
router.delete('/:commentId', commentsController.remove);

export default router;
