import { Knex } from 'knex';

/**
 * Seeds the Ayuta coffee price list with the prices the owner provided.
 * Idempotent: only inserts when the workspace has NO price rows yet, so a
 * re-run (or a later manual edit) is never clobbered.
 *
 * created_by is left NULL (system seed). Every row can be edited/deleted
 * from the UI afterward.
 */

interface SeedRow {
  product_name: string;
  channel: string;
  unit_label: string;
  price: number;
  note?: string | null;
}

const ROWS: SeedRow[] = [
  // 생두
  { product_name: '생두', channel: '네이버 스마트스토어', unit_label: '1kg', price: 14000 },
  { product_name: '생두', channel: '도매(부가세 포함)', unit_label: '1kg', price: 13000 },
  { product_name: '생두', channel: '도매(부가세 포함)', unit_label: '10kg 이상', price: 12000, note: '10kg 이상 시' },

  // 드립 (도매 없음)
  { product_name: '드립', channel: '소매', unit_label: '200g', price: 7000 },
  { product_name: '드립', channel: '소매', unit_label: '500g', price: 15000 },

  // 에스프레소
  { product_name: '에스프레소', channel: '소매', unit_label: '200g', price: 7000 },
  { product_name: '에스프레소', channel: '소매', unit_label: '500g', price: 15000 },
  { product_name: '에스프레소', channel: '도매(부가세 미포함)', unit_label: '1kg', price: 24000 },
  { product_name: '에스프레소', channel: '도매(부가세 미포함)', unit_label: '10kg 이상', price: 22000, note: '10kg 이상 시' },

  // 바닐라빈
  { product_name: '바닐라빈', channel: '소매', unit_label: '25g', price: 13000 },
  { product_name: '바닐라빈', channel: '소매', unit_label: '100g', price: 50000 },
  { product_name: '바닐라빈', channel: '도매(부가세 포함)', unit_label: '25g', price: 11000 },
  { product_name: '바닐라빈', channel: '도매(부가세 포함)', unit_label: '100g', price: 44000 },
];

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('price_items');
  if (!hasTable) return;

  const [{ count }] = await knex('price_items')
    .where('workspace', '아유타')
    .count<{ count: string }[]>('id as count');
  const existing = parseInt(String(count), 10) || 0;
  if (existing > 0) return; // already has data — don't clobber

  const now = knex.fn.now();
  const inserts = ROWS.map((r, idx) => ({
    product_name: r.product_name,
    channel: r.channel,
    unit_label: r.unit_label,
    price: r.price,
    note: r.note ?? null,
    sort_order: idx,
    workspace: '아유타',
    created_by: null,
    created_at: now,
    updated_at: now,
  }));

  await knex('price_items').insert(inserts);
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('price_items');
  if (!hasTable) return;
  // Only remove the system-seeded rows (created_by NULL) for the workspace.
  await knex('price_items').where({ workspace: '아유타', created_by: null }).delete();
}
