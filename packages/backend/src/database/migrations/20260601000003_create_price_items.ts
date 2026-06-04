import { Knex } from 'knex';

/**
 * Ayuta coffee price list (단가표).
 *
 * Prices vary by product, sales channel (retail / Naver / wholesale), tax
 * inclusion, and quantity tier — so each price point is one flexible row.
 * The UI groups rows by product_name.
 *
 * channel values (kept as free-ish string, validated in the zod layer):
 *   네이버 스마트스토어 | 소매 | 도매(부가세 포함) | 도매(부가세 미포함)
 */

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('price_items');
  if (exists) return;

  await knex.schema.createTable('price_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.string('product_name', 100).notNullable(); // 생두 / 드립 / 에스프레소 / 바닐라빈 ...
    table.string('channel', 40).notNullable();        // 소매 / 네이버 스마트스토어 / 도매(부가세 포함) / 도매(부가세 미포함)
    table.string('unit_label', 40).notNullable();      // 1kg / 10kg 이상 / 200g / 500g / 25g / 100g
    table.decimal('price', 12, 2).notNullable().defaultTo(0); // 원
    table.text('note').nullable();
    table.integer('sort_order').notNullable().defaultTo(0);

    table.string('workspace', 100).notNullable();
    // Nullable so a seed / system insert (no user) is allowed, and deleting
    // a user doesn't wipe the price list.
    table
      .uuid('created_by')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['workspace'], 'idx_price_items_workspace');
    table.index(['workspace', 'product_name'], 'idx_price_items_workspace_product');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('price_items');
}
