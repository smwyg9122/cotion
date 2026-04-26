import { Response } from 'express';
import { CalendarService } from '../services/calendar.service';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { calendarEventCreateSchema, calendarEventUpdateSchema } from '@cotion/shared';
import { ActivityLogService } from '../services/activity-log.service';

export const calendarController = {
  getEvents: asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspace = req.query.workspace as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (!workspace || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'workspace, startDate, endDate are required',
        },
      });
    }

    const events = await CalendarService.getEvents(workspace, startDate, endDate);

    res.json({
      success: true,
      data: events,
    });
  }),

  getEvent: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const event = await CalendarService.getEventById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '이벤트를 찾을 수 없습니다',
        },
      });
    }

    res.json({
      success: true,
      data: event,
    });
  }),

  createEvent: asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = calendarEventCreateSchema.parse(req.body);
    const event = await CalendarService.createEvent(input, req.user!.userId);

    ActivityLogService.log(req.user!.userId, 'event_create', 'event', event.id, { title: event.title });

    res.status(201).json({
      success: true,
      data: event,
    });
  }),

  updateEvent: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const input = calendarEventUpdateSchema.parse(req.body);
    const event = await CalendarService.updateEvent(id, input, req.user!.userId);

    ActivityLogService.log(req.user!.userId, 'event_update', 'event', id, { title: event.title });

    res.json({
      success: true,
      data: event,
    });
  }),

  deleteEvent: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await CalendarService.deleteEvent(id, req.user!.userId);

    ActivityLogService.log(req.user!.userId, 'event_delete', 'event', id);

    res.json({
      success: true,
      data: { message: '이벤트가 삭제되었습니다' },
    });
  }),

  getPageDeadlines: asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspace = req.query.workspace as string;

    if (!workspace) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'workspace is required',
        },
      });
    }

    const deadlines = await CalendarService.getPageDeadlines(workspace);

    res.json({
      success: true,
      data: deadlines,
    });
  }),
};
