import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('document_tags');
  if (!exists) {
    await knex.schema.createTable('document_tags', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('tagged_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['document_id', 'user_id']);
      table.index(['document_id'], 'idx_document_tags_document_id');
      table.index(['user_id'], 'idx_document_tags_user_id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('document_tags');
}
