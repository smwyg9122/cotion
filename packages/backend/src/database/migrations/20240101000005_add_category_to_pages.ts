import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasCategory = await knex.schema.hasColumn('pages', 'category');
  if (!hasCategory) {
    await knex.schema.alterTable('pages', (table) => {
      table.string('category', 100).nullable().defaultTo(null);
    });
  }
  // Add index if not exists
  const indexExists = await knex.raw(`
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pages_category'
  `);
  if (indexExists.rows.length === 0) {
    await knex.schema.alterTable('pages', (table) => {
      table.index('category', 'idx_pages_category');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('pages', (table) => {
    table.dropIndex('category', 'idx_pages_category');
    table.dropColumn('category');
  });
}
