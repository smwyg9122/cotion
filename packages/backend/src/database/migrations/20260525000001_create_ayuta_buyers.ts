import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('ayuta_buyers');
  if (!exists) {
    await knex.schema.createTable('ayuta_buyers', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

      // 기본 정보
      table.string('company_name', 200).notNullable();
      table.string('contact_person', 200).nullable();
      table.string('phone', 50).nullable();
      table.string('email', 200).nullable();
      table.string('kakao_id', 100).nullable();
      table.string('instagram', 200).nullable();
      table.string('region', 100).nullable();
      table.text('address').nullable();
      table.string('business_type', 30).nullable();
      table.string('size', 20).nullable();
      table.string('source', 30).nullable();

      // 구매/관심 정보 (interest_items as jsonb array of strings)
      table.jsonb('interest_items').notNullable().defaultTo('[]');
      table.text('interest_products').nullable();
      table.string('monthly_volume', 100).nullable();
      table.boolean('sample_sent').notNullable().defaultTo(false);
      table.boolean('cupping_done').notNullable().defaultTo(false);

      // 영업 파이프라인
      table.string('status', 30).notNullable().defaultTo('신규문의');
      table.string('interest_level', 20).notNullable().defaultTo('medium');
      table.date('last_contact_date').nullable();
      table.text('next_action').nullable();
      table.date('follow_up_date').nullable();

      // 주문 관리
      table.date('first_order_date').nullable();
      table.date('last_order_date').nullable();
      table.decimal('total_purchase_amount', 14, 2).notNullable().defaultTo(0);
      table.decimal('total_purchase_kg', 12, 3).notNullable().defaultTo(0);
      table.integer('repeat_count').notNullable().defaultTo(0);

      // 메모
      table.text('notes').nullable();

      table.string('workspace', 100).notNullable();
      table
        .uuid('created_by')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['workspace'], 'idx_ayuta_buyers_workspace');
      table.index(['status'], 'idx_ayuta_buyers_status');
      table.index(['follow_up_date'], 'idx_ayuta_buyers_follow_up_date');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ayuta_buyers');
}
