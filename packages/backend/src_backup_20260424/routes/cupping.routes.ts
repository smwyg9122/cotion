import { Router } from 'express';
import { cuppingController } from '../controllers/cupping.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// /followups must come BEFORE /:id
router.get('/followups', cuppingController.getDueFollowups);

router.get('/', cuppingController.getAll);
router.post('/', cuppingController.create);
router.get('/:id', cuppingController.getById);
router.put('/:id', cuppingController.update);
router.delete('/:id', cuppingController.delete);

export default router;
