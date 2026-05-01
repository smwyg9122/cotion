import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasStatus = await knex.schema.hasColumn('documents', 'status');
  if (!hasStatus) {
    await knex.schema.alterTable('documents', (table) => {
      table.string('status', 30).notNullable().defaultTo('draft');
    });
    // Add index for status-based queries (kanban view)
    await knex.schema.alterTable('documents', (table) => {
      table.index(['status'], 'idx_documents_status');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasStatus = await knex.schema.hasColumn('documents', 'status');
  if (hasStatus) {
    await knex.schema.alterTable('documents', (table) => {
      table.dropIndex(['status'], 'idx_documents_status');
      table.dropColumn('status');
    });
  }
}
