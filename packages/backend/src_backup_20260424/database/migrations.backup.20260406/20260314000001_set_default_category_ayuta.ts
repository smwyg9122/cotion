import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Set category to '아유타' for all root-level pages that have no category
  await knex('pages')
    .whereNull('parent_id')
    .andWhere(function () {
      this.whereNull('category').orWhere('category', '');
    })
    .update({ category: '아유타' });
}

export async function down(knex: Knex): Promise<void> {
  // Revert: clear category for pages that were set to '아유타'
  await knex('pages')
    .whereNull('parent_id')
    .andWhere('category', '아유타')
    .update({ category: null });
}
