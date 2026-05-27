import { z } from 'zod';
import { emptyToUndefined } from './helpers';

const businessTypeEnum = z.enum([
  '카페',
  '로스터리',
  '도매',
  '기업',
  '유통사',
  '기타',
]);

const sizeEnum = z.enum(['소형', '중형', '대형']);

const sourceEnum = z.enum([
  '영도커피축제',
  '인스타그램',
  '소개',
  '스마트스토어',
  '네이버',
  '지인',
  '커핑행사',
  '기타',
]);

const interestItemEnum = z.enum([
  '로부스타',
  '아라비카',
  '원두',
  '생두',
  '바닐라',
  '드립백',
]);

const statusEnum = z.enum([
  '신규문의',
  '연락완료',
  '샘플발송',
  '커핑완료',
  '견적전달',
  '테스트중',
  '구매완료',
  '재구매',
  '보류',
  '종료',
]);

const interestLevelEnum = z.enum(['high', 'medium', 'low']);

// YYYY-MM-DD or ISO date-time. Reject loose Date.parse-accepted garbage
// (e.g. "2020-13-45", "Jan 99 1999") by doing a strict shape + real-date check.
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?$/;

function isValidDateLike(val: string): boolean {
  if (val === '') return true;
  if (!YMD_RE.test(val) && !ISO_RE.test(val)) return false;
  const d = new Date(val);
  if (isNaN(d.getTime())) return false;
  // For YYYY-MM-DD form, confirm the parts round-trip (rejects 2020-02-30 etc.)
  if (YMD_RE.test(val)) {
    const [y, m, day] = val.split('-').map(Number);
    if (d.getUTCFullYear() !== y || d.getUTCMonth() + 1 !== m || d.getUTCDate() !== day) {
      return false;
    }
  }
  return true;
}

const dateLikeString = z
  .string()
  .max(50)
  .refine(isValidDateLike, { message: '유효한 날짜 형식이 아닙니다 (YYYY-MM-DD)' });

// Coerce empty email to undefined to avoid strict email regex on blank input
const optionalEmail = z
  .string()
  .max(200)
  .optional()
  .transform((v) => (v === '' || v === undefined ? undefined : v))
  .pipe(z.string().email().optional());

export const ayutaBuyerCreateSchema = z.object({
  companyName: z.string().min(1, '업체명을 입력하세요').max(200),
  contactPerson: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: optionalEmail,
  kakaoId: z.string().max(100).optional(),
  instagram: z.string().max(200).optional(),
  region: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  // Wrap enums so unselected <select> → undefined (not "" which fails enum check).
  businessType: emptyToUndefined(businessTypeEnum.optional()),
  size: emptyToUndefined(sizeEnum.optional()),
  source: emptyToUndefined(sourceEnum.optional()),

  interestItems: z.array(interestItemEnum).optional().default([]),
  interestProducts: z.string().max(500).optional(),
  monthlyVolume: z.string().max(100).optional(),
  sampleSent: z.boolean().optional().default(false),
  cuppingDone: z.boolean().optional().default(false),

  status: emptyToUndefined(statusEnum.optional().default('신규문의')),
  interestLevel: emptyToUndefined(interestLevelEnum.optional().default('medium')),
  lastContactDate: dateLikeString.optional().nullable(),
  nextAction: z.string().max(500).optional(),
  followUpDate: dateLikeString.optional().nullable(),

  firstOrderDate: dateLikeString.optional().nullable(),
  lastOrderDate: dateLikeString.optional().nullable(),
  totalPurchaseAmount: z.number().nonnegative().optional().default(0),
  totalPurchaseKg: z.number().nonnegative().optional().default(0),
  repeatCount: z.number().int().nonnegative().optional().default(0),

  notes: z.string().max(5000).optional(),

  workspace: z.string().max(100),
});

export const ayutaBuyerUpdateSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  contactPerson: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z
    .union([z.string().email().max(200), z.literal(''), z.null()])
    .optional(),
  kakaoId: z.string().max(100).optional().nullable(),
  instagram: z.string().max(200).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  businessType: emptyToUndefined(businessTypeEnum.optional().nullable()),
  size: emptyToUndefined(sizeEnum.optional().nullable()),
  source: emptyToUndefined(sourceEnum.optional().nullable()),

  interestItems: z.array(interestItemEnum).optional(),
  interestProducts: z.string().max(500).optional().nullable(),
  monthlyVolume: z.string().max(100).optional().nullable(),
  sampleSent: z.boolean().optional(),
  cuppingDone: z.boolean().optional(),

  status: emptyToUndefined(statusEnum.optional()),
  interestLevel: emptyToUndefined(interestLevelEnum.optional()),
  lastContactDate: dateLikeString.optional().nullable(),
  nextAction: z.string().max(500).optional().nullable(),
  followUpDate: dateLikeString.optional().nullable(),

  firstOrderDate: dateLikeString.optional().nullable(),
  lastOrderDate: dateLikeString.optional().nullable(),
  totalPurchaseAmount: z.number().nonnegative().optional(),
  totalPurchaseKg: z.number().nonnegative().optional(),
  repeatCount: z.number().int().nonnegative().optional(),

  notes: z.string().max(5000).optional().nullable(),
});
