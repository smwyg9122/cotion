import { Router } from 'express';
import { priceItemsController } from '../controllers/price-items.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', priceItemsController.getAll);
router.post('/', priceItemsController.create);
router.put('/:id', priceItemsController.update);
router.delete('/:id', priceItemsController.delete);

export default router;
