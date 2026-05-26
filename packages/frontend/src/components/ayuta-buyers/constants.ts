/**
 * Runtime constants for the Ayuta Buyer DB UI.
 *
 * These mirror the values defined in `packages/shared/src/types/ayuta-buyer.types.ts`,
 * but live here in the frontend bundle because vite/rollup's CommonJS-to-ESM
 * interop cannot statically extract named exports forwarded via `export *`
 * from the shared package's compiled CJS dist. Importing them from
 * `@cotion/shared` directly causes Rollup to fail with
 * `"BUYER_STATUSES" is not exported by "../shared/dist/index.js"`.
 *
 * Keep these in sync with the shared types definition. Types themselves
 * (`BuyerStatus`, `BuyerBusinessType`, etc.) are still imported from
 * `@cotion/shared` — those are erased at compile time so the interop
 * problem doesn't apply.
 */
import type {
  BuyerBusinessType,
  BuyerSize,
  BuyerSource,
  BuyerInterestItem,
  BuyerStatus,
  BuyerInterestLevel,
} from '@cotion/shared';

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
