import { Router } from 'express';
import { pagesController } from '../controllers/pages.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', pagesController.getAll);
router.get('/trash/all', pagesController.getDeleted);
router.get('/:id', pagesController.getById);
router.post('/', pagesController.create);
router.put('/:id', pagesController.update);
router.delete('/:id', pagesController.delete);
router.put('/:id/restore', pagesController.restore);
router.delete('/:id/permanent', pagesController.permanentDelete);
router.get('/:id/children', pagesController.getChildren);
router.get('/:id/breadcrumb', pagesController.getBreadcrumb);
router.put('/:id/move', pagesController.move);

export default router;
