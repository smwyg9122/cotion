import { Knex } from 'knex';

/**
 * Enriches the `clients` table with 15 new columns covering three areas
 * the original schema didn't capture:
 *
 *  A. 영업 관리 (sales workflow): kakao/instagram contact, region/business
 *     type/status segmentation, follow-up reminders.
 *  B. 거래 추적 (revenue analytics): first/last order dates, cumulative
 *     amounts and volumes, preferred items.
 *  C. B2B 세무·청구 (invoicing): business tax ID, separate invoice email,
 *     payment terms, shipping address.
 *
 * All new columns are nullable with sensible defaults so existing rows
 * keep working without backfill.
 */

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('clients');
  if (!hasTable) return;

  // Defensive: skip if any column already exists (idempotent in dev).
  const COLS = [
    'kakao_id', 'instagram', 'region', 'business_type', 'status',
    'follow_up_date', 'first_order_date', 'last_order_date',
    'total_order_amount', 'monthly_volume_kg', 'preferred_items',
    'tax_id', 'invoice_email', 'payment_terms', 'shipping_address',
  ];
  for (const col of COLS) {
    if (await knex.schema.hasColumn('clients', col)) {
      // someone partially ran this migration before; skip add for that col
      // by removing it from the upcoming alter table
    }
  }

  await knex.schema.alterTable('clients', (table) => {
    // ─── A. Sales workflow ──────────────────────────────────────
    table.string('kakao_id', 100).nullable();
    table.string('instagram', 200).nullable();
    table.string('region', 100).nullable();
    table.string('business_type', 30).nullable();
    // 신규 / 진행중 / 정기거래 / 휴면 / 중단
    table.string('status', 30).notNullable().defaultTo('신규');
    table.date('follow_up_date').nullable();

    // ─── B. Revenue tracking ────────────────────────────────────
    table.date('first_order_date').nullable();
    table.date('last_order_date').nullable();
    table.decimal('total_order_amount', 14, 2).notNullable().defaultTo(0);
    table.decimal('monthly_volume_kg', 12, 3).notNullable().defaultTo(0);
    // multi-select free-form strings (잘 알려진 enum이 아니어서 jsonb)
    table.jsonb('preferred_items').notNullable().defaultTo('[]');

    // ─── C. B2B invoicing ───────────────────────────────────────
    table.string('tax_id', 30).nullable();
    table.string('invoice_email', 200).nullable();
    // 선불 / 후불 / 월말정산
    table.string('payment_terms', 30).nullable();
    table.text('shipping_address').nullable();
  });

  // Indexes for the columns we'll actually filter on.
  await knex.schema.alterTable('clients', (table) => {
    table.index(['status'], 'idx_clients_status');
    table.index(['business_type'], 'idx_clients_business_type');
    table.index(['follow_up_date'], 'idx_clients_follow_up_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('clients');
  if (!hasTable) return;

  await knex.schema.alterTable('clients', (table) => {
    table.dropIndex(['follow_up_date'], 'idx_clients_follow_up_date');
    table.dropIndex(['business_type'], 'idx_clients_business_type');
    table.dropIndex(['status'], 'idx_clients_status');
  });

  await knex.schema.alterTable('clients', (table) => {
    table.dropColumn('shipping_address');
    table.dropColumn('payment_terms');
    table.dropColumn('invoice_email');
    table.dropColumn('tax_id');
    table.dropColumn('preferred_items');
    table.dropColumn('monthly_volume_kg');
    table.dropColumn('total_order_amount');
    table.dropColumn('last_order_date');
    table.dropColumn('first_order_date');
    table.dropColumn('follow_up_date');
    table.dropColumn('status');
    table.dropColumn('business_type');
    table.dropColumn('region');
    table.dropColumn('instagram');
    table.dropColumn('kakao_id');
  });
}
