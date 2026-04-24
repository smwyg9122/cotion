import { z } from 'zod';

export const clientCreateSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요').max(200),
  contactPerson: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(200).optional(),
  address: z.string().max(500).optional(),
  visited: z.boolean().optional().default(false),
  cuppingDone: z.boolean().optional().default(false),
  purchased: z.boolean().optional().default(false),
  assignedTo: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
  workspace: z.string().max(100),
});

export const clientUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contactPerson: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(200).optional(),
  address: z.string().max(500).optional(),
  visited: z.boolean().optional(),
  cuppingDone: z.boolean().optional(),
  purchased: z.boolean().optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  notes: z.string().max(5000).optional(),
});
