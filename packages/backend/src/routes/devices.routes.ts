import { Router } from 'express';
import { devicesController } from '../controllers/devices.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.post('/register', devicesController.register);
router.post('/unregister', devicesController.unregister);

export default router;
