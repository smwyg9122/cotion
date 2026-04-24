import { Response } from 'express';
import { ClientsService } from '../services/clients.service';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { clientCreateSchema, clientUpdateSchema } from '@cotion/shared';

export const clientsController = {
  getAll: asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspace = req.query.workspace as string;
    const visited = req.query.visited as string;
    const cuppingDone = req.query.cuppingDone as string;
    const purchased = req.query.purchased as string;
    const assignedTo = req.query.assignedTo as string;

    if (!workspace) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'workspace is required',
        },
      });
    }

    const clients = await ClientsService.getAll(workspace, {
      visited: visited ? visited === 'true' : undefined,
      cuppingDone: cuppingDone ? cuppingDone === 'true' : undefined,
      purchased: purchased ? purchased === 'true' : undefined,
      assignedTo,
    });

    res.json({
      success: true,
      data: clients,
    });
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const client = await ClientsService.getById(id);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '거래처를 찾을 수 없습니다',
        },
      });
    }

    res.json({
      success: true,
      data: client,
    });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = clientCreateSchema.parse(req.body);
    const client = await ClientsService.create(input, req.user!.userId);

    res.status(201).json({
      success: true,
      data: client,
    });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const input = clientUpdateSchema.parse(req.body);
    const client = await ClientsService.update(id, input, req.user!.userId);

    res.json({
      success: true,
      data: client,
    });
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await ClientsService.delete(id, req.user!.userId);

    res.json({
      success: true,
      data: { message: '거래처가 삭제되었습니다' },
    });
  }),
};
