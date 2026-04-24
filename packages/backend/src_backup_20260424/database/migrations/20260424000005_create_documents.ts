import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('documents');
  if (!exists) {
    await knex.schema.createTable('documents', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('title', 300).notNullable();
      table.string('category', 50).notNullable().defaultTo('기타');
      table.uuid('file_id').nullable().references('id').inTable('files').onDelete('SET NULL');
      table.uuid('page_id').nullable().references('id').inTable('pages').onDelete('SET NULL');
      table.text('description').nullable();
      table.string('workspace', 100).notNullable();
      table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['workspace'], 'idx_documents_workspace');
      table.index(['category'], 'idx_documents_category');
      table.index(['file_id'], 'idx_documents_file_id');
      table.index(['page_id'], 'idx_documents_page_id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('documents');
}
