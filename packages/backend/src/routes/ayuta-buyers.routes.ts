import { Router } from 'express';
import { ayutaBuyersController } from '../controllers/ayuta-buyers.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', ayutaBuyersController.getAll);
router.get('/stats', ayutaBuyersController.getStats);
router.post('/', ayutaBuyersController.create);
router.get('/:id', ayutaBuyersController.getById);
router.put('/:id', ayutaBuyersController.update);
router.delete('/:id', ayutaBuyersController.delete);

export default router;
