import { z } from 'zod';
import {
  optionalEmail,
  optionalUuid,
  optionalNullableUuid,
  emptyToUndefined,
} from './helpers';

// ─── Sub-schemas (shared between create + update) ──────────────────

const businessTypeEnum = z.enum([
  '카페',
  '로스터리',
  '도매',
  '기업',
  '유통사',
  '기타',
]);

const statusEnum = z.enum(['신규', '진행중', '정기거래', '휴면', '중단']);

const paymentTermsEnum = z.enum(['선불', '후불', '월말정산']);

// Wrappers so an unselected <select> (empty string "") becomes undefined
// before the strict enum check. Mirrors emptyToUndefined for strings.
// Each variant exposes nullable for UPDATE schemas (where null = clear).
const optionalBusinessType  = emptyToUndefined(businessTypeEnum.optional());
const nullableBusinessType  = emptyToUndefined(businessTypeEnum.optional().nullable());
const optionalStatus        = emptyToUndefined(statusEnum.optional().default('신규'));
const updateStatus          = emptyToUndefined(statusEnum.optional());
const optionalPaymentTerms  = emptyToUndefined(paymentTermsEnum.optional());
const nullablePaymentTerms  = emptyToUndefined(paymentTermsEnum.optional().nullable());

// Strict YYYY-MM-DD or ISO date; empty strings coerced to undefined.
const optionalDate = emptyToUndefined(z.string().max(50).optional().nullable());

// Email field that's specifically for billing — same coercion as optionalEmail
// but with a different label in the API.
const optionalInvoiceEmail = optionalEmail;

// ─── Create ────────────────────────────────────────────────────────

export const clientCreateSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요').max(200),
  contactPerson: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: optionalEmail,
  address: z.string().max(500).optional(),
  visited: z.boolean().optional().default(false),
  cuppingDone: z.boolean().optional().default(false),
  purchased: z.boolean().optional().default(false),
  assignedTo: optionalUuid,
  notes: z.string().max(5000).optional(),
  workspace: z.string().max(100),

  // A. 영업 관리
  kakaoId: z.string().max(100).optional(),
  instagram: z.string().max(200).optional(),
  region: z.string().max(100).optional(),
  businessType: optionalBusinessType,
  status: optionalStatus,
  followUpDate: optionalDate,

  // B. 거래 추적
  firstOrderDate: optionalDate,
  lastOrderDate: optionalDate,
  totalOrderAmount: z.number().nonnegative().optional().default(0),
  monthlyVolumeKg: z.number().nonnegative().optional().default(0),
  preferredItems: z.array(z.string().max(100)).optional().default([]),

  // C. B2B 세무·청구
  taxId: z.string().max(30).optional(),
  invoiceEmail: optionalInvoiceEmail,
  paymentTerms: optionalPaymentTerms,
  shippingAddress: z.string().max(500).optional(),
});

// ─── Update ────────────────────────────────────────────────────────

export const clientUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contactPerson: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: optionalEmail,
  address: z.string().max(500).optional().nullable(),
  visited: z.boolean().optional(),
  cuppingDone: z.boolean().optional(),
  purchased: z.boolean().optional(),
  assignedTo: optionalNullableUuid,
  notes: z.string().max(5000).optional().nullable(),

  // A
  kakaoId: z.string().max(100).optional().nullable(),
  instagram: z.string().max(200).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  businessType: nullableBusinessType,
  status: updateStatus,
  followUpDate: optionalDate,

  // B
  firstOrderDate: optionalDate,
  lastOrderDate: optionalDate,
  totalOrderAmount: z.number().nonnegative().optional(),
  monthlyVolumeKg: z.number().nonnegative().optional(),
  preferredItems: z.array(z.string().max(100)).optional(),

  // C
  taxId: z.string().max(30).optional().nullable(),
  invoiceEmail: optionalInvoiceEmail,
  paymentTerms: nullablePaymentTerms,
  shippingAddress: z.string().max(500).optional().nullable(),
});
