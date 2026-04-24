import { z } from 'zod';

export const cuppingLogCreateSchema = z.object({
  visitDate: z.string().min(1, '방문일을 입력하세요'),
  clientId: z.string().uuid().optional(),
  roasteryName: z.string().min(1, '로스터리 이름을 입력하세요').max(200),
  contactPerson: z.string().max(200).optional(),
  offeredBeans: z.string().max(1000).optional(),
  reaction: z.string().max(2000).optional(),
  purchaseIntent: z.string().max(500).optional(),
  followupDate: z.string().optional(),
  followupNotified: z.boolean().optional().default(false),
  notes: z.string().max(5000).optional(),
  workspace: z.string().max(100),
});

export const cuppingLogUpdateSchema = z.object({
  visitDate: z.string().min(1).optional(),
  clientId: z.string().uuid().optional().nullable(),
  roasteryName: z.string().min(1).max(200).optional(),
  contactPerson: z.string().max(200).optional(),
  offeredBeans: z.string().max(1000).optional(),
  reaction: z.string().max(2000).optional(),
  purchaseIntent: z.string().max(500).optional(),
  followupDate: z.string().optional().nullable(),
  followupNotified: z.boolean().optional(),
  notes: z.string().max(5000).optional(),
});
