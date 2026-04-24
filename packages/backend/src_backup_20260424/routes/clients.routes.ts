import { Router } from 'express';
import { clientsController } from '../controllers/clients.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', clientsController.getAll);
router.post('/', clientsController.create);
router.get('/:id', clientsController.getById);
router.put('/:id', clientsController.update);
router.delete('/:id', clientsController.delete);

export default router;
