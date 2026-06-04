import { z } from 'zod';
import { optionalEnum } from './helpers';

const channelEnum = z.enum([
  '소매',
  '네이버 스마트스토어',
  '도매(부가세 포함)',
  '도매(부가세 미포함)',
]);

export const priceItemCreateSchema = z.object({
  productName: z.string().min(1, '제품명을 입력하세요').max(100),
  // channel is required. A bare enum rejects both "" and a missing value with
  // a clean 400 (not a 500) — which is what we want, since a price with no
  // channel is ambiguous. The FE always submits one of the 4 values from its
  // <select> (default 소매), so this only ever fires for malformed direct API
  // calls. (Update uses optionalEnum to allow partial edits.)
  channel: channelEnum,
  unitLabel: z.string().min(1, '단위를 입력하세요').max(40),
  price: z.number().nonnegative('가격은 0 이상이어야 합니다'),
  note: z.string().max(500).optional(),
  sortOrder: z.number().int().optional().default(0),
  workspace: z.string().max(100),
});

export const priceItemUpdateSchema = z.object({
  productName: z.string().min(1).max(100).optional(),
  channel: optionalEnum(channelEnum),
  unitLabel: z.string().min(1).max(40).optional(),
  price: z.number().nonnegative().optional(),
  note: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
});
