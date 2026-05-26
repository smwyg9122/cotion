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
 * Idempotent: each column add is per-column-guarded so a partial run can
 * be safely retried. Index creation also tolerates re-runs.
 */

interface ColumnSpec {
  name: string;
  add: (table: Knex.AlterTableBuilder) => void;
}

const COLUMNS: ColumnSpec[] = [
  // ─── A. Sales workflow ──────────────────────────────────────
  { name: 'kakao_id',          add: (t) => t.string('kakao_id', 100).nullable() },
  { name: 'instagram',         add: (t) => t.string('instagram', 200).nullable() },
  { name: 'region',            add: (t) => t.string('region', 100).nullable() },
  { name: 'business_type',     add: (t) => t.string('business_type', 30).nullable() },
  // 신규 / 진행중 / 정기거래 / 휴면 / 중단
  { name: 'status',            add: (t) => t.string('status', 30).notNullable().defaultTo('신규') },
  { name: 'follow_up_date',    add: (t) => t.date('follow_up_date').nullable() },

  // ─── B. Revenue tracking ────────────────────────────────────
  { name: 'first_order_date',   add: (t) => t.date('first_order_date').nullable() },
  { name: 'last_order_date',    add: (t) => t.date('last_order_date').nullable() },
  { name: 'total_order_amount', add: (t) => t.decimal('total_order_amount', 14, 2).notNullable().defaultTo(0) },
  { name: 'monthly_volume_kg',  add: (t) => t.decimal('monthly_volume_kg', 12, 3).notNullable().defaultTo(0) },
  { name: 'preferred_items',    add: (t) => t.jsonb('preferred_items').notNullable().defaultTo('[]') },

  // ─── C. B2B invoicing ───────────────────────────────────────
  { name: 'tax_id',            add: (t) => t.string('tax_id', 30).nullable() },
  { name: 'invoice_email',     add: (t) => t.string('invoice_email', 200).nullable() },
  // 선불 / 후불 / 월말정산
  { name: 'payment_terms',     add: (t) => t.string('payment_terms', 30).nullable() },
  { name: 'shipping_address',  add: (t) => t.text('shipping_address').nullable() },
];

const INDEXES: Array<{ name: string; columns: string[] }> = [
  { name: 'idx_clients_status',          columns: ['status'] },
  { name: 'idx_clients_business_type',   columns: ['business_type'] },
  { name: 'idx_clients_follow_up_date',  columns: ['follow_up_date'] },
];

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('clients');
  if (!hasTable) return;

  // Add each column only if it doesn't exist yet, so a partial prior run
  // can be safely re-attempted.
  for (const col of COLUMNS) {
    const exists = await knex.schema.hasColumn('clients', col.name);
    if (!exists) {
      await knex.schema.alterTable('clients', (table) => col.add(table));
    }
  }

  // Indexes are easier — wrap in try/catch since IF NOT EXISTS syntax
  // varies by knex/pg version. Re-adding an existing index is harmless;
  // failure is non-fatal because the column adds already succeeded.
  for (const idx of INDEXES) {
    try {
      await knex.raw(
        `CREATE INDEX IF NOT EXISTS ${idx.name} ON clients (${idx.columns.join(', ')})`
      );
    } catch (err) {
      // Best-effort; index creation failure shouldn't block migration.
      // eslint-disable-next-line no-console
      console.warn(`migration: index ${idx.name} create failed:`, (err as Error).message);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('clients');
  if (!hasTable) return;

  for (const idx of INDEXES) {
    try {
      await knex.raw(`DROP INDEX IF EXISTS ${idx.name}`);
    } catch {
      // ignore
    }
  }

  // Drop in reverse order; each guarded so partial up() runs can be undone.
  for (const col of [...COLUMNS].reverse()) {
    const exists = await knex.schema.hasColumn('clients', col.name);
    if (exists) {
      await knex.schema.alterTable('clients', (table) => {
        table.dropColumn(col.name);
      });
    }
  }
}
