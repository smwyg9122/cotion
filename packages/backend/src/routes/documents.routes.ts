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

// Tag management
router.post('/:id/tags', documentsController.addTags);
router.delete('/:id/tags', documentsController.removeTags);
router.get('/:id/tags', documentsController.getTags);

// Status update (for kanban drag-and-drop)
router.patch('/:id/status', documentsController.updateStatus);

export default router;
