import { Response } from 'express';
import { ClientsService } from '../services/clients.service';
import { assertWorkspaceAccess } from '../services/pages.service';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { clientCreateSchema, clientUpdateSchema } from '@cotion/shared';

export const clientsController = {
  getAll: asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    const visited = req.query.visited as string;
    const cuppingDone = req.query.cuppingDone as string;
    const purchased = req.query.purchased as string;
    const assignedTo = req.query.assignedTo as string;
    const status = req.query.status as string;
    const businessType = req.query.businessType as string;
    const region = req.query.region as string;

    const clients = await ClientsService.getAll(workspace, {
      visited: visited ? visited === 'true' : undefined,
      cuppingDone: cuppingDone ? cuppingDone === 'true' : undefined,
      purchased: purchased ? purchased === 'true' : undefined,
      assignedTo,
      status: status || undefined,
      businessType: businessType || undefined,
      region: region || undefined,
    });

    res.json({ success: true, data: clients });
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    const client = await ClientsService.getById(id, workspace);
    if (!client) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '거래처를 찾을 수 없습니다' },
      });
    }
    res.json({ success: true, data: client });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = clientCreateSchema.parse(req.body);
    // create takes workspace from body — validate caller has access
    await assertWorkspaceAccess(req.user!.userId, input.workspace);

    const client = await ClientsService.create(input, req.user!.userId);
    res.status(201).json({ success: true, data: client });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    const input = clientUpdateSchema.parse(req.body);
    const client = await ClientsService.update(id, input, workspace);
    res.json({ success: true, data: client });
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    await ClientsService.delete(id, workspace);
    res.json({ success: true, data: { message: '거래처가 삭제되었습니다' } });
  }),
};
