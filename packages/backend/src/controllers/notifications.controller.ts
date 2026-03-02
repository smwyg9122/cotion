import { Response } from 'express';
import { NotificationsService } from '../services/notifications.service';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export const notificationsController = {
  getAll: asyncHandler(async (req: AuthRequest, res: Response) => {
    const notifications = await NotificationsService.getNotifications(req.user!.userId);
    res.json({ success: true, data: notifications });
  }),

  getUnreadCount: asyncHandler(async (req: AuthRequest, res: Response) => {
    const count = await NotificationsService.getUnreadCount(req.user!.userId);
    res.json({ success: true, data: { count } });
  }),

  createMention: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { mentionedUserId, pageId } = req.body;
    const notification = await NotificationsService.createMention(
      mentionedUserId,
      pageId,
      req.user!.userId
    );
    res.status(201).json({ success: true, data: notification });
  }),

  markAsRead: asyncHandler(async (req: AuthRequest, res: Response) => {
    await NotificationsService.markAsRead(req.params.id, req.user!.userId);
    res.json({ success: true, data: { message: '읽음 처리되었습니다' } });
  }),

  markAllAsRead: asyncHandler(async (req: AuthRequest, res: Response) => {
    await NotificationsService.markAllAsRead(req.user!.userId);
    res.json({ success: true, data: { message: '모두 읽음 처리되었습니다' } });
  }),
};
