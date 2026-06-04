/**
 * Runtime constants for the price list UI. Inlined here (not imported from
 * @cotion/shared) for the same Rollup CJS-interop reason as ayuta-buyers —
 * vite can't statically extract named value exports forwarded via export *
 * from the shared package's compiled dist. Types still come from shared.
 */
import type { PriceChannel } from '@cotion/shared';

export const PRICE_CHANNELS: PriceChannel[] = [
  '소매',
  '네이버 스마트스토어',
  '도매(부가세 포함)',
  '도매(부가세 미포함)',
];

// Channel → badge color (Notion-ish soft tones).
export const CHANNEL_STYLES: Record<PriceChannel, { bg: string; text: string }> = {
  '소매': { bg: 'bg-blue-50', text: 'text-blue-700' },
  '네이버 스마트스토어': { bg: 'bg-green-50', text: 'text-green-700' },
  '도매(부가세 포함)': { bg: 'bg-amber-50', text: 'text-amber-700' },
  '도매(부가세 미포함)': { bg: 'bg-orange-50', text: 'text-orange-700' },
};
