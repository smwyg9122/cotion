import { Router } from 'express';
import { calendarController } from '../controllers/calendar.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', calendarController.getEvents);
router.get('/deadlines', calendarController.getPageDeadlines);
router.get('/:id', calendarController.getEvent);
router.post('/', calendarController.createEvent);
router.put('/:id', calendarController.updateEvent);
router.delete('/:id', calendarController.deleteEvent);

export default router;
