import { Response } from 'express';
import { InventoryService } from '../services/inventory.service';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { inventoryCreateSchema, inventoryUpdateSchema, inventoryTransactionCreateSchema } from '@cotion/shared';

export const inventoryController = {
  getAll: asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspace = req.query.workspace as string;
    const type = req.query.type as string;

    if (!workspace) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'workspace is required',
        },
      });
    }

    const items = await InventoryService.getAll(workspace, { type });

    res.json({
      success: true,
      data: items,
    });
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const item = await InventoryService.getById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '재고 항목을 찾을 수 없습니다',
        },
      });
    }

    res.json({
      success: true,
      data: item,
    });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = inventoryCreateSchema.parse(req.body);
    const item = await InventoryService.create(input, req.user!.userId);

    res.status(201).json({
      success: true,
      data: item,
    });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const input = inventoryUpdateSchema.parse(req.body);
    const item = await InventoryService.update(id, input);

    res.json({
      success: true,
      data: item,
    });
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await InventoryService.delete(id);

    res.json({
      success: true,
      data: { message: '재고 항목이 삭제되었습니다' },
    });
  }),

  addTransaction: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const input = inventoryTransactionCreateSchema.parse(req.body);
    const transaction = await InventoryService.addTransaction(id, input, req.user!.userId);

    res.status(201).json({
      success: true,
      data: transaction,
    });
  }),

  getTransactions: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const transactions = await InventoryService.getTransactions(id);

    res.json({
      success: true,
      data: transactions,
    });
  }),
};
