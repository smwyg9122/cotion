import { z } from 'zod';

export const documentCreateSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(200),
  category: z.string().max(100).optional(),
  fileId: z.string().uuid().optional(),
  pageId: z.string().uuid().optional(),
  description: z.string().max(2000).optional(),
  workspace: z.string().max(100),
});

export const documentUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.string().max(100).optional(),
  fileId: z.string().uuid().optional().nullable(),
  pageId: z.string().uuid().optional().nullable(),
  description: z.string().max(2000).optional(),
});
