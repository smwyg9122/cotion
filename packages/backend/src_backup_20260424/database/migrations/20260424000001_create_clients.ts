import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('clients');
  if (!exists) {
    await knex.schema.createTable('clients', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 200).notNullable();
      table.string('contact_person', 100).nullable();
      table.string('phone', 50).nullable();
      table.string('email', 200).nullable();
      table.text('address').nullable();
      table.boolean('visited').notNullable().defaultTo(false);
      table.boolean('cupping_done').notNullable().defaultTo(false);
      table.boolean('purchased').notNullable().defaultTo(false);
      table.uuid('assigned_to').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.text('notes').nullable();
      table.string('workspace', 100).notNullable();
      table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['workspace'], 'idx_clients_workspace');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('clients');
}
