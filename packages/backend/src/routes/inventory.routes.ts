import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', inventoryController.getAll);
router.post('/', inventoryController.create);
router.get('/:id', inventoryController.getById);
router.put('/:id', inventoryController.update);
router.delete('/:id', inventoryController.delete);
router.post('/:id/transactions', inventoryController.addTransaction);
router.get('/:id/transactions', inventoryController.getTransactions);

export default router;
