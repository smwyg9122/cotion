export type PriceChannel =
  | '소매'
  | '네이버 스마트스토어'
  | '도매(부가세 포함)'
  | '도매(부가세 미포함)';

export interface PriceItem {
  id: string;
  productName: string;
  channel: PriceChannel;
  unitLabel: string;
  price: number;
  note: string | null;
  sortOrder: number;
  workspace: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PriceItemCreateInput {
  productName: string;
  channel: PriceChannel;
  unitLabel: string;
  price: number;
  note?: string;
  sortOrder?: number;
  workspace: string;
}

export interface PriceItemUpdateInput {
  productName?: string;
  channel?: PriceChannel;
  unitLabel?: string;
  price?: number;
  note?: string | null;
  sortOrder?: number;
}

export const PRICE_CHANNELS: PriceChannel[] = [
  '소매',
  '네이버 스마트스토어',
  '도매(부가세 포함)',
  '도매(부가세 미포함)',
];
