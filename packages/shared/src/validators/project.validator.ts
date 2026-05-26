import { z } from 'zod';
import { emptyToUndefined } from './helpers';

export const projectCreateSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(200),
  description: z.string().max(2000).optional(),
  status: z.string().max(50).optional(),
  workspace: z.string().max(100),
});

export const projectUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.string().max(50).optional(),
});

export const taskCreateSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional().default('todo'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  position: z.number().min(0).optional(),
  // FE date inputs send "" when cleared.
  dueDate: emptyToUndefined(z.string().optional().nullable()),
  assignees: z.array(z.string().uuid()).optional().default([]),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  position: z.number().min(0).optional(),
  dueDate: emptyToUndefined(z.string().optional().nullable()),
  assignees: z.array(z.string().uuid()).optional(),
});

export const taskMoveSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'done']),
  position: z.number().min(0),
});
