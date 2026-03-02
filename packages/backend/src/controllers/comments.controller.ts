import { Response } from 'express';
import { CommentsService } from '../services/comments.service';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export const commentsController = {
  getByPage: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { pageId } = req.params;
    const comments = await CommentsService.getCommentsByPage(pageId);
    res.json({ success: true, data: comments });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { pageId } = req.params;
    const { content } = req.body;
    const comment = await CommentsService.createComment(pageId, req.user!.userId, content);
    res.status(201).json({ success: true, data: comment });
  }),

  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { commentId } = req.params;
    await CommentsService.deleteComment(commentId, req.user!.userId);
    res.json({ success: true });
  }),
};
