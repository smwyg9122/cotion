import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('pages', (table) => {
    table.string('category', 100).nullable().defaultTo(null);
    table.index('category', 'idx_pages_category');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('pages', (table) => {
    table.dropIndex('category', 'idx_pages_category');
    table.dropColumn('category');
  });
}
