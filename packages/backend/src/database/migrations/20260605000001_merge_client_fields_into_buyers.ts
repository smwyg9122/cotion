import { Knex } from 'knex';

/**
 * 거래처(clients) → 구매처(ayuta_buyers) 통합 — Phase 1 (스키마, 순수 추가).
 *
 * 두 기능이 사실상 같은 "아유타 고객"을 중복 관리하던 것을 ayuta_buyers 하나로
 * 합치기 위해, 거래처에만 있던 필드를 ayuta_buyers로 흡수한다. 이 마이그레이션은
 * 컬럼 추가만 하며(데이터 이관·커핑 재연결은 Phase 2에서), 모두 nullable 또는
 * default 가 있어 기존 데이터/코드에 무해하다.
 *
 *  - assigned_to      : 담당자 배정 (users FK, SET NULL)
 *  - tax_id           : 사업자등록번호
 *  - invoice_email    : 세금계산서 이메일
 *  - payment_terms    : 결제 조건 (선불 / 후불 / 월말정산)
 *  - shipping_address : 배송지 주소
 *  - monthly_volume_kg: 월 평균 발주량(kg) — 거래처의 숫자형 물량.
 *      (ayuta_buyers.monthly_volume(text "월 50kg 예상")와 별개의 정량 필드)
 *
 * 멱등: 컬럼별 hasColumn 가드 + try/catch 로 부분 실행을 안전하게 재시도할 수 있고,
 * 한 컬럼 실패가 마이그레이션 체인을 막지 않는다(enrich_clients 와 동일 패턴).
 */

interface ColumnSpec {
  name: string;
  add: (table: Knex.AlterTableBuilder) => void;
}

const COLUMNS: ColumnSpec[] = [
  {
    name: 'assigned_to',
    add: (t) => t.uuid('assigned_to').nullable().references('id').inTable('users').onDelete('SET NULL'),
  },
  { name: 'tax_id', add: (t) => t.string('tax_id', 30).nullable() },
  { name: 'invoice_email', add: (t) => t.string('invoice_email', 200).nullable() },
  // 선불 / 후불 / 월말정산
  { name: 'payment_terms', add: (t) => t.string('payment_terms', 30).nullable() },
  { name: 'shipping_address', add: (t) => t.text('shipping_address').nullable() },
  { name: 'monthly_volume_kg', add: (t) => t.decimal('monthly_volume_kg', 12, 3).notNullable().defaultTo(0) },
];

const INDEXES: Array<{ name: string; columns: string[] }> = [
  { name: 'idx_ayuta_buyers_assigned_to', columns: ['assigned_to'] },
];

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('ayuta_buyers');
  if (!hasTable) return;

  for (const col of COLUMNS) {
    const exists = await knex.schema.hasColumn('ayuta_buyers', col.name);
    if (!exists) {
      try {
        await knex.schema.alterTable('ayuta_buyers', (table) => col.add(table));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[merge_client_fields] add column ${col.name} failed:`, (err as Error).message);
      }
    }
  }

  for (const idx of INDEXES) {
    try {
      await knex.raw(
        `CREATE INDEX IF NOT EXISTS ${idx.name} ON ayuta_buyers (${idx.columns.join(', ')})`
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`migration: index ${idx.name} create failed:`, (err as Error).message);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('ayuta_buyers');
  if (!hasTable) return;

  for (const idx of INDEXES) {
    try {
      await knex.raw(`DROP INDEX IF EXISTS ${idx.name}`);
    } catch {
      // ignore
    }
  }

  for (const col of [...COLUMNS].reverse()) {
    const exists = await knex.schema.hasColumn('ayuta_buyers', col.name);
    if (exists) {
      try {
        await knex.schema.alterTable('ayuta_buyers', (table) => {
          table.dropColumn(col.name);
        });
      } catch {
        // ignore
      }
    }
  }
}
