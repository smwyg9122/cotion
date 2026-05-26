import { Response } from 'express';
import { AyutaBuyersService } from '../services/ayuta-buyers.service';
import { assertWorkspaceAccess } from '../services/pages.service';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  ayutaBuyerCreateSchema,
  ayutaBuyerUpdateSchema,
} from '@cotion/shared';

export const ayutaBuyersController = {
  getAll: asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    const buyers = await AyutaBuyersService.getAll(workspace, {
      status: (req.query.status as string) || undefined,
      region: (req.query.region as string) || undefined,
      businessType: (req.query.businessType as string) || undefined,
      interestLevel: (req.query.interestLevel as string) || undefined,
      search: (req.query.search as string) || undefined,
    });

    res.json({ success: true, data: buyers });
  }),

  getStats: asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    const stats = await AyutaBuyersService.getStats(workspace);
    res.json({ success: true, data: stats });
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    const buyer = await AyutaBuyersService.getById(id, workspace);
    if (!buyer) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '구매처를 찾을 수 없습니다' },
      });
    }
    res.json({ success: true, data: buyer });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = ayutaBuyerCreateSchema.parse(req.body);
    await assertWorkspaceAccess(req.user!.userId, input.workspace);

    const buyer = await AyutaBuyersService.create(input, req.user!.userId);
    res.status(201).json({ success: true, data: buyer });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    const input = ayutaBuyerUpdateSchema.parse(req.body);
    const buyer = await AyutaBuyersService.update(id, input, workspace);
    res.json({ success: true, data: buyer });
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    await AyutaBuyersService.delete(id, workspace);
    res.json({ success: true, data: { message: '구매처가 삭제되었습니다' } });
  }),
};
