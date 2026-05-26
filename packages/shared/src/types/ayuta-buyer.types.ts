export type BuyerBusinessType =
  | '카페'
  | '로스터리'
  | '도매'
  | '기업'
  | '유통사'
  | '기타';

export type BuyerSize = '소형' | '중형' | '대형';

export type BuyerSource =
  | '영도커피축제'
  | '인스타그램'
  | '소개'
  | '스마트스토어'
  | '네이버'
  | '지인'
  | '커핑행사'
  | '기타';

export type BuyerInterestItem =
  | '로부스타'
  | '아라비카'
  | '원두'
  | '생두'
  | '바닐라'
  | '드립백';

export type BuyerStatus =
  | '신규문의'
  | '연락완료'
  | '샘플발송'
  | '커핑완료'
  | '견적전달'
  | '테스트중'
  | '구매완료'
  | '재구매'
  | '보류'
  | '종료';

export type BuyerInterestLevel = 'high' | 'medium' | 'low';

export interface AyutaBuyer {
  id: string;

  // 기본 정보
  companyName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  kakaoId: string | null;
  instagram: string | null;
  region: string | null;
  address: string | null;
  businessType: BuyerBusinessType | null;
  size: BuyerSize | null;
  source: BuyerSource | null;

  // 구매/관심 정보
  interestItems: BuyerInterestItem[];
  interestProducts: string | null;
  monthlyVolume: string | null;
  sampleSent: boolean;
  cuppingDone: boolean;

  // 영업 파이프라인
  status: BuyerStatus;
  interestLevel: BuyerInterestLevel;
  lastContactDate: string | null;
  nextAction: string | null;
  followUpDate: string | null;

  // 주문 관리
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  totalPurchaseAmount: number;
  totalPurchaseKg: number;
  repeatCount: number;

  // 메모
  notes: string | null;

  workspace: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AyutaBuyerCreateInput {
  companyName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  kakaoId?: string;
  instagram?: string;
  region?: string;
  address?: string;
  businessType?: BuyerBusinessType;
  size?: BuyerSize;
  source?: BuyerSource;

  interestItems?: BuyerInterestItem[];
  interestProducts?: string;
  monthlyVolume?: string;
  sampleSent?: boolean;
  cuppingDone?: boolean;

  status?: BuyerStatus;
  interestLevel?: BuyerInterestLevel;
  lastContactDate?: string | null;
  nextAction?: string;
  followUpDate?: string | null;

  firstOrderDate?: string | null;
  lastOrderDate?: string | null;
  totalPurchaseAmount?: number;
  totalPurchaseKg?: number;
  repeatCount?: number;

  notes?: string;

  workspace: string;
}

export interface AyutaBuyerUpdateInput {
  companyName?: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  kakaoId?: string | null;
  instagram?: string | null;
  region?: string | null;
  address?: string | null;
  businessType?: BuyerBusinessType | null;
  size?: BuyerSize | null;
  source?: BuyerSource | null;

  interestItems?: BuyerInterestItem[];
  interestProducts?: string | null;
  monthlyVolume?: string | null;
  sampleSent?: boolean;
  cuppingDone?: boolean;

  status?: BuyerStatus;
  interestLevel?: BuyerInterestLevel;
  lastContactDate?: string | null;
  nextAction?: string | null;
  followUpDate?: string | null;

  firstOrderDate?: string | null;
  lastOrderDate?: string | null;
  totalPurchaseAmount?: number;
  totalPurchaseKg?: number;
  repeatCount?: number;

  notes?: string | null;
}

export const BUYER_BUSINESS_TYPES: BuyerBusinessType[] = [
  '카페',
  '로스터리',
  '도매',
  '기업',
  '유통사',
  '기타',
];

export const BUYER_SIZES: BuyerSize[] = ['소형', '중형', '대형'];

export const BUYER_SOURCES: BuyerSource[] = [
  '영도커피축제',
  '인스타그램',
  '소개',
  '스마트스토어',
  '네이버',
  '지인',
  '커핑행사',
  '기타',
];

export const BUYER_INTEREST_ITEMS: BuyerInterestItem[] = [
  '로부스타',
  '아라비카',
  '원두',
  '생두',
  '바닐라',
  '드립백',
];

export const BUYER_STATUSES: BuyerStatus[] = [
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
];

export const BUYER_INTEREST_LEVELS: BuyerInterestLevel[] = ['high', 'medium', 'low'];
