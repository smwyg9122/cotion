import { z } from 'zod';
import { emptyToUndefined } from './helpers';

const taskStatusEnum = z.enum(['todo', 'in_progress', 'done']);
const taskPriorityEnum = z.enum(['low', 'medium', 'high']);

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
  // Wrap enums with emptyToUndefined so blank <select> values don't 400.
  status: emptyToUndefined(taskStatusEnum.optional().default('todo')),
  priority: emptyToUndefined(taskPriorityEnum.optional().default('medium')),
  position: z.number().min(0).optional(),
  // FE date inputs send "" when cleared.
  dueDate: emptyToUndefined(z.string().optional().nullable()),
  assignees: z.array(z.string().uuid()).optional().default([]),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: emptyToUndefined(taskStatusEnum.optional()),
  priority: emptyToUndefined(taskPriorityEnum.optional()),
  position: z.number().min(0).optional(),
  dueDate: emptyToUndefined(z.string().optional().nullable()),
  assignees: z.array(z.string().uuid()).optional(),
});

export const taskMoveSchema = z.object({
  // status here is REQUIRED — moving a task without a target status is
  // meaningless. We don't coerce "" because that would silently turn a
  // missing field into a 400 with a more confusing message; the explicit
  // enum error is fine here.
  status: taskStatusEnum,
  position: z.number().min(0),
});
