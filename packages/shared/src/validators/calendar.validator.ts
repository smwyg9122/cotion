import { z } from 'zod';
import { optionalUuid, optionalNullableUuid, emptyToUndefined } from './helpers';

export const calendarEventCreateSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(200),
  description: z.string().max(2000).optional(),
  startDate: z.string().min(1),
  // FE clears date pickers to "" — coerce to undefined.
  endDate: emptyToUndefined(z.string().optional()),
  allDay: z.boolean().optional().default(true),
  color: z.string().max(20).optional(),
  workspace: z.string().max(100),
  pageId: optionalUuid,
  attendees: z.array(z.string().uuid()).optional(),
});

export const calendarEventUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  startDate: emptyToUndefined(z.string().optional()),
  endDate: emptyToUndefined(z.string().optional()),
  allDay: z.boolean().optional(),
  color: z.string().max(20).optional(),
  pageId: optionalNullableUuid,
  attendees: z.array(z.string().uuid()).optional(),
});
