import { Response } from 'express';
import { PriceItemsService } from '../services/price-items.service';
import { assertWorkspaceAccess } from '../services/pages.service';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { priceItemCreateSchema, priceItemUpdateSchema } from '@cotion/shared';

export const priceItemsController = {
  getAll: asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    const items = await PriceItemsService.getAll(workspace);
    res.json({ success: true, data: items });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = priceItemCreateSchema.parse(req.body);
    await assertWorkspaceAccess(req.user!.userId, input.workspace);

    const item = await PriceItemsService.create(input, req.user!.userId);
    res.status(201).json({ success: true, data: item });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    const input = priceItemUpdateSchema.parse(req.body);
    const item = await PriceItemsService.update(id, input, workspace);
    res.json({ success: true, data: item });
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const workspace = (req.query.workspace as string) || '';
    await assertWorkspaceAccess(req.user!.userId, workspace);

    await PriceItemsService.delete(id, workspace);
    res.json({ success: true, data: { message: '단가 항목이 삭제되었습니다' } });
  }),
};
