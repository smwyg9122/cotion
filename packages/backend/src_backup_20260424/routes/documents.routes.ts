import { Router } from 'express';
import { documentsController } from '../controllers/documents.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', documentsController.getAll);
router.post('/', documentsController.create);
router.get('/:id', documentsController.getById);
router.put('/:id', documentsController.update);
router.delete('/:id', documentsController.delete);

export default router;
