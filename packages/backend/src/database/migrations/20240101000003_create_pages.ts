import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable LTREE extension for hierarchical data
  await knex.raw('CREATE EXTENSION IF NOT EXISTS ltree;');

  await knex.schema.createTable('pages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title', 500).notNullable();
    table.text('content').nullable(); // Yjs document state (JSON)
    table.string('icon', 50).nullable(); // emoji or icon identifier
    table.string('cover_image', 500).nullable();
    table.specificType('path', 'ltree').notNullable(); // hierarchical path
    table.uuid('parent_id').nullable().references('id').inTable('pages').onDelete('CASCADE');
    table.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.timestamp('deleted_at').nullable();
    table.integer('position').notNullable().defaultTo(0); // for ordering siblings

    // Indexes
    table.index('parent_id', 'idx_pages_parent_id');
    table.index('created_by', 'idx_pages_created_by');
    table.index('updated_at', 'idx_pages_updated_at');
  });

  // Create GIST index for LTREE path (enables fast hierarchical queries)
  await knex.raw('CREATE INDEX idx_pages_path ON pages USING GIST(path);');

  // Create trigger for updating updated_at
  await knex.raw(`
    CREATE TRIGGER update_pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS update_pages_updated_at ON pages;');
  await knex.schema.dropTableIfExists('pages');
  await knex.raw('DROP EXTENSION IF EXISTS ltree;');
}
