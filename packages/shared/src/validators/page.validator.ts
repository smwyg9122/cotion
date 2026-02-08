import { z } from 'zod';

export const pageCreateSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(500),
  content: z.string().optional(),
  icon: z.string().max(50).optional(),
  parentId: z.string().uuid().optional(),
  category: z.string().max(100).optional(),
});

export const pageUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  icon: z.string().max(50).optional(),
  coverImage: z.string().url().optional(),
  category: z.string().max(100).optional().nullable(),
});

export const pageMoveSchema = z.object({
  newParentId: z.string().uuid().optional(),
  position: z.number().int().min(0).optional(),
});
