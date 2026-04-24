import { z } from 'zod';

export const inventoryCreateSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요').max(200),
  type: z.string().min(1).max(100),
  origin: z.string().max(200).optional(),
  variety: z.string().max(200).optional(),
  process: z.string().max(200).optional(),
  totalIn: z.number().min(0).optional().default(0),
  currentStock: z.number().min(0).optional().default(0),
  storageLocation: z.string().max(200).optional(),
  workspace: z.string().max(100),
});

export const inventoryUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.string().min(1).max(100).optional(),
  origin: z.string().max(200).optional(),
  variety: z.string().max(200).optional(),
  process: z.string().max(200).optional(),
  totalIn: z.number().min(0).optional(),
  currentStock: z.number().min(0).optional(),
  storageLocation: z.string().max(200).optional(),
});

export const inventoryTransactionCreateSchema = z.object({
  type: z.enum(['in', 'out']),
  quantity: z.number().min(0.01, '수량을 입력하세요'),
  note: z.string().max(1000).optional(),
});
