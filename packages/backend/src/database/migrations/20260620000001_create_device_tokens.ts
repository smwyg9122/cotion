import { Knex } from 'knex';

/**
 * FCM(푸시 알림) 디바이스 토큰 저장 테이블.
 * 한 사용자가 여러 기기(안드로이드/iOS/웹)를 가질 수 있으므로 user_id:token = 1:N.
 * token은 전역 고유(같은 기기 재등록 시 upsert)하며, 사용자가 로그아웃하거나
 * FCM이 무효 토큰으로 응답하면 삭제된다.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('device_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('token').notNullable();
    table.string('platform', 16).notNullable(); // 'android' | 'ios' | 'web'
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_used_at').notNullable().defaultTo(knex.fn.now());

    // 같은 FCM 토큰이 중복 저장되지 않도록(기기 재등록은 upsert로 처리)
    table.unique('token', { indexName: 'uq_device_tokens_token' });
    table.index('user_id', 'idx_device_tokens_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('device_tokens');
}
