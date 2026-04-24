import { Response } from 'express';
import { CuppingService } from '../services/cupping.service';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { cuppingLogCreateSchema, cuppingLogUpdateSchema } from '@cotion/shared';

export const cuppingController = {
  getAll: asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspace = req.query.workspace as string;
    const clientId = req.query.clientId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (!workspace) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'workspace is required',
        },
      });
    }

    const logs = await CuppingService.getAll(workspace, { clientId, startDate, endDate });

    res.json({
      success: true,
      data: logs,
    });
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const log = await CuppingService.getById(id);

    if (!log) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '커핑 기록을 찾을 수 없습니다',
        },
      });
    }

    res.json({
      success: true,
      data: log,
    });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = cuppingLogCreateSchema.parse(req.body);
    const log = await CuppingService.create(input, req.user!.userId);

    res.status(201).json({
      success: true,
      data: log,
    });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const input = cuppingLogUpdateSchema.parse(req.body);
    const log = await CuppingService.update(id, input, req.user!.userId);

    res.json({
      success: true,
      data: log,
    });
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await CuppingService.delete(id, req.user!.userId);

    res.json({
      success: true,
      data: { message: '커핑 기록이 삭제되었습니다' },
    });
  }),

  getDueFollowups: asyncHandler(async (req: AuthRequest, res: Response) => {
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

    const followups = await CuppingService.getDueFollowups(workspace);

    res.json({
      success: true,
      data: followups,
    });
  }),
};
