import { z } from 'zod';
import { optionalUuid, emptyToUndefined } from './helpers';

export const pageCreateSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(500),
  content: z.string().optional(),
  icon: z.string().max(50).optional(),
  parentId: optionalUuid,
  category: z.string().max(100).optional(),
  workspace: z.string().max(100).optional(),
});

export const pageUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  icon: z.string().max(50).optional(),
  // Empty string from blank file/URL input is treated as "not provided".
  coverImage: emptyToUndefined(z.string().url().optional()),
  category: z.string().max(100).optional().nullable(),
  workspace: z.string().max(100).optional().nullable(),
});

export const pageMoveSchema = z.object({
  newParentId: optionalUuid,
  position: z.number().int().min(0).optional(),
  category: z.string().max(100).optional(),
});
