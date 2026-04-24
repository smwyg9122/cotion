import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Set ALL root-level pages to '아유타' regardless of current category value
  await knex('pages')
    .whereNull('parent_id')
    .update({ category: '아유타' });
}

export async function down(knex: Knex): Promise<void> {
  // Cannot reliably revert since we don't know original categories
}
