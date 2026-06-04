import { Knex } from 'knex';

/**
 * 거래처(clients) → 구매처(ayuta_buyers) 통합 — Phase 2 (데이터 이관 + 커핑 재연결).
 *
 * Phase 1 에서 흡수 컬럼을 추가했으니, 이제 실제 거래처 데이터를 ayuta_buyers 로
 * 옮긴다. 핵심 트릭: 새 buyer 행이 **원본 clients.id 를 그대로 PK 로 재사용**한다.
 *   - 같은 id 라 PK 충돌 → 재실행해도 중복 INSERT 안 됨(완벽 멱등).
 *   - cupping_logs.client_id 와 동일 UUID → buyer_id = client_id 로 연결 보존.
 *
 * clients 테이블/데이터는 **삭제하지 않고 휴면 보존**한다(안전·되돌리기 가능).
 * UI(거래처 DB 메뉴/페이지)만 Phase 4 에서 제거된다.
 *
 * 상태 매핑(거래처 5단계 → 구매처 10단계):
 *   신규→신규문의, 진행중→테스트중, 정기거래→재구매, 휴면→보류, 중단→종료
 *
 * 멱등/방어: hasTable·hasColumn 가드, 행별 try/catch 로 한 행 실패가 전체 체인을
 * 막지 않는다. ayuta_buyers 는 CHECK(workspace='아유타') 가 있으므로 아유타 행만 이관.
 */

// ★ 이 마이그레이션은 트랜잭션 OFF로 실행한다.
// knex 는 기본적으로 각 마이그레이션을 단일 트랜잭션으로 감싸는데, 그 안에서는
// 한 행의 INSERT 가 실패하면 Postgres 가 트랜잭션 전체를 abort(25P02) 시켜
// 이후 모든 행·UPDATE 가 조용히 무시되고(우리 try/catch 가 삼킴) 그대로 커밋된다.
// transaction:false 로 두면 각 문장이 독립 커밋되어, 한 행 실패가 나머지 행과
// 커핑 재연결을 막지 않는다(= 주석이 약속한 진짜 행 단위 복원력). 멱등성은
// id 재사용(PK)·buyer_id IS NULL 가드로 이미 보장되므로 원자성 손실은 무해하다.
export const config = { transaction: false };

const STATUS_MAP: Record<string, string> = {
  신규: '신규문의',
  진행중: '테스트중',
  정기거래: '재구매',
  휴면: '보류',
  중단: '종료',
};

export async function up(knex: Knex): Promise<void> {
  // 1) cupping_logs.buyer_id (FK → ayuta_buyers, SET NULL) 추가
  if (
    (await knex.schema.hasTable('cupping_logs')) &&
    !(await knex.schema.hasColumn('cupping_logs', 'buyer_id'))
  ) {
    try {
      await knex.schema.alterTable('cupping_logs', (t) => {
        t.uuid('buyer_id').nullable().references('id').inTable('ayuta_buyers').onDelete('SET NULL');
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[migrate_clients] add cupping_logs.buyer_id failed:', (err as Error).message);
    }
  }

  // 2) clients → ayuta_buyers 행 복사 (id 재사용 → 멱등)
  if ((await knex.schema.hasTable('clients')) && (await knex.schema.hasTable('ayuta_buyers'))) {
    let clients: any[] = [];
    try {
      clients = await knex('clients').where({ workspace: '아유타' });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[migrate_clients] read clients failed:', (err as Error).message);
    }

    // created_by / assigned_to 는 users FK(SET NULL)다. 존재하지 않는 사용자를
    // 가리키는 stale 참조는 INSERT 시 FK 위반(23503)을 내므로, 미리 유효한
    // user id 집합을 만들어 두고 stale 참조는 null 로 떨군다(= SET NULL 과 동일 의미).
    const validUserIds = new Set<string>();
    try {
      const userRows = await knex('users').select('id');
      for (const u of userRows) validUserIds.add(u.id);
    } catch {
      // users 조회 실패 시엔 보수적으로 모든 FK 를 null 처리(아래 has() 가 false)
    }
    const safeUserRef = (id: unknown): string | null =>
      typeof id === 'string' && validUserIds.has(id) ? id : null;

    for (const c of clients) {
      try {
        const exists = await knex('ayuta_buyers').where({ id: c.id }).first();
        if (exists) continue; // 이미 이관됨

        // preferred_items(jsonb 배열) → interest_products(text, 콤마 결합)
        let interestProducts: string | null = null;
        try {
          const raw = c.preferred_items;
          const arr = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
          if (Array.isArray(arr) && arr.length) interestProducts = arr.join(', ');
        } catch {
          interestProducts = null;
        }

        await knex('ayuta_buyers').insert({
          id: c.id, // ★ 원본 clients.id 재사용
          company_name: c.name,
          phone: c.phone ?? null,
          email: c.email ?? null,
          kakao_id: c.kakao_id ?? null,
          instagram: c.instagram ?? null,
          region: c.region ?? null,
          address: c.address ?? null,
          business_type: c.business_type ?? null,
          status: STATUS_MAP[c.status as string] || '신규문의',
          interest_level: 'medium',
          interest_products: interestProducts,
          follow_up_date: c.follow_up_date ?? null,
          first_order_date: c.first_order_date ?? null,
          last_order_date: c.last_order_date ?? null,
          total_purchase_amount: c.total_order_amount ?? 0,
          monthly_volume_kg: c.monthly_volume_kg ?? 0,
          tax_id: c.tax_id ?? null,
          invoice_email: c.invoice_email ?? null,
          payment_terms: c.payment_terms ?? null,
          shipping_address: c.shipping_address ?? null,
          assigned_to: safeUserRef(c.assigned_to),
          notes: c.notes ?? null,
          workspace: c.workspace,
          created_by: safeUserRef(c.created_by),
          created_at: c.created_at,
          updated_at: c.updated_at,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[migrate_clients] migrate client ${c.id} failed:`, (err as Error).message);
      }
    }
  }

  // 3) 커핑 연결 재지정: buyer_id = client_id (동일 UUID)
  if (await knex.schema.hasColumn('cupping_logs', 'buyer_id')) {
    try {
      await knex.raw(
        `UPDATE cupping_logs
           SET buyer_id = client_id
         WHERE client_id IS NOT NULL
           AND buyer_id IS NULL
           AND EXISTS (SELECT 1 FROM ayuta_buyers b WHERE b.id = cupping_logs.client_id)`
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[migrate_clients] repoint cupping buyer_id failed:', (err as Error).message);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // 이관된 buyer 행(= clients 와 동일 id) 제거
  if ((await knex.schema.hasTable('clients')) && (await knex.schema.hasTable('ayuta_buyers'))) {
    try {
      await knex.raw(
        `DELETE FROM ayuta_buyers WHERE workspace = '아유타' AND id IN (SELECT id FROM clients)`
      );
    } catch {
      // ignore
    }
  }
  // cupping_logs.buyer_id 컬럼 제거
  if (
    (await knex.schema.hasTable('cupping_logs')) &&
    (await knex.schema.hasColumn('cupping_logs', 'buyer_id'))
  ) {
    try {
      await knex.schema.alterTable('cupping_logs', (t) => t.dropColumn('buyer_id'));
    } catch {
      // ignore
    }
  }
}
