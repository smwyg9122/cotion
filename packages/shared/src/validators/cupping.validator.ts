import { z } from 'zod';
import { optionalUuid, optionalNullableUuid, emptyToUndefined } from './helpers';

export const cuppingLogCreateSchema = z.object({
  visitDate: z.string().min(1, '방문일을 입력하세요'),
  clientId: optionalUuid,
  roasteryName: z.string().min(1, '로스터리 이름을 입력하세요').max(200),
  contactPerson: z.string().max(200).optional(),
  offeredBeans: z.string().max(1000).optional(),
  reaction: z.string().max(2000).optional(),
  purchaseIntent: z.string().max(500).optional(),
  // FE date inputs send "" when cleared — coerce to undefined so the
  // optional-nullable schema doesn't trip on an unfilled date field.
  followupDate: emptyToUndefined(z.string().optional().nullable()),
  followupNotified: z.boolean().optional().default(false),
  notes: z.string().max(5000).optional(),
  workspace: z.string().max(100),
});

export const cuppingLogUpdateSchema = z.object({
  visitDate: z.string().min(1).optional(),
  clientId: optionalNullableUuid,
  roasteryName: z.string().min(1).max(200).optional(),
  contactPerson: z.string().max(200).optional(),
  offeredBeans: z.string().max(1000).optional(),
  reaction: z.string().max(2000).optional(),
  purchaseIntent: z.string().max(500).optional(),
  followupDate: emptyToUndefined(z.string().optional().nullable()),
  followupNotified: z.boolean().optional(),
  notes: z.string().max(5000).optional(),
});
