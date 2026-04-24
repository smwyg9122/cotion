import { Router } from 'express';
import { projectsController } from '../controllers/projects.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Task routes must come BEFORE /:id routes
router.put('/tasks/:taskId', projectsController.updateTask);
router.put('/tasks/:taskId/move', projectsController.moveTask);
router.delete('/tasks/:taskId', projectsController.deleteTask);

// Project routes
router.get('/', projectsController.getAll);
router.post('/', projectsController.create);
router.get('/:id', projectsController.getById);
router.put('/:id', projectsController.update);
router.delete('/:id', projectsController.delete);
router.get('/:id/tasks', projectsController.getTasks);
router.post('/:id/tasks', projectsController.createTask);

export default router;
