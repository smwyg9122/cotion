import { z } from 'zod';

export const calendarEventCreateSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(200),
  description: z.string().max(2000).optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  allDay: z.boolean().optional().default(true),
  color: z.string().max(20).optional(),
  workspace: z.string().max(100),
  pageId: z.string().uuid().optional(),
  attendees: z.array(z.string().uuid()).optional(),
});

export const calendarEventUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  allDay: z.boolean().optional(),
  color: z.string().max(20).optional(),
  pageId: z.string().uuid().optional().nullable(),
  attendees: z.array(z.string().uuid()).optional(),
});
