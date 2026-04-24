import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add workspace column
  await knex.schema.alterTable('pages', (table) => {
    table.string('workspace', 100).nullable();
  });

  // Set all existing root pages' workspace to '아유타'
  await knex('pages')
    .whereNull('parent_id')
    .update({ workspace: '아유타' });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('pages', (table) => {
    table.dropColumn('workspace');
  });
}
