import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add workspace column (idempotent — R009)
  const hasWorkspace = await knex.schema.hasColumn('pages', 'workspace');
  if (!hasWorkspace) {
    await knex.schema.alterTable('pages', (table) => {
      table.string('workspace', 100).nullable();
    });
  }

  // Set all existing root pages' workspace to '아유타' (only if not already set)
  await knex('pages')
    .whereNull('parent_id')
    .whereNull('workspace')
    .update({ workspace: '아유타' });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('pages', (table) => {
    table.dropColumn('workspace');
  });
}
