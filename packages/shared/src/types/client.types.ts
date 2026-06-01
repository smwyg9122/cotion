// ─── Enum-like literals shared between FE and BE ──────────────────

export type ClientBusinessType =
  | '카페'
  | '로스터리'
  | '도매'
  | '기업'
  | '유통사'
  | '기타';

export type ClientStatus =
  | '신규'
  | '진행중'
  | '정기거래'
  | '휴면'
  | '중단';

export type ClientPaymentTerms =
  | '선불'
  | '후불'
  | '월말정산';

// ─── Main entity ──────────────────────────────────────────────────

export interface Client {
  id: string;

  // 기본 정보
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;

  // 담당자
  assignedTo: string | null;
  assignedToName?: string;

  // ─── A. 영업 관리 ────────────────────────────────────
  kakaoId: string | null;
  instagram: string | null;
  region: string | null;
  businessType: ClientBusinessType | null;
  status: ClientStatus;
  followUpDate: string | null;

  // ─── B. 거래 추적 ────────────────────────────────────
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  totalOrderAmount: number;
  monthlyVolumeKg: number;
  preferredItems: string[];

  // ─── C. B2B 세무·청구 ─────────────────────────────────
  taxId: string | null;
  invoiceEmail: string | null;
  paymentTerms: ClientPaymentTerms | null;
  shippingAddress: string | null;

  notes: string | null;
  workspace: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Inputs ───────────────────────────────────────────────────────

export interface ClientCreateInput {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  assignedTo?: string;
  notes?: string;
  workspace: string;

  // A
  kakaoId?: string;
  instagram?: string;
  region?: string;
  businessType?: ClientBusinessType;
  status?: ClientStatus;
  followUpDate?: string | null;

  // B
  firstOrderDate?: string | null;
  lastOrderDate?: string | null;
  totalOrderAmount?: number;
  monthlyVolumeKg?: number;
  preferredItems?: string[];

  // C
  taxId?: string;
  invoiceEmail?: string;
  paymentTerms?: ClientPaymentTerms;
  shippingAddress?: string;
}

export interface ClientUpdateInput {
  name?: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  assignedTo?: string | null;
  notes?: string | null;

  // A
  kakaoId?: string | null;
  instagram?: string | null;
  region?: string | null;
  businessType?: ClientBusinessType | null;
  status?: ClientStatus;
  followUpDate?: string | null;

  // B
  firstOrderDate?: string | null;
  lastOrderDate?: string | null;
  totalOrderAmount?: number;
  monthlyVolumeKg?: number;
  preferredItems?: string[];

  // C
  taxId?: string | null;
  invoiceEmail?: string | null;
  paymentTerms?: ClientPaymentTerms | null;
  shippingAddress?: string | null;
}
