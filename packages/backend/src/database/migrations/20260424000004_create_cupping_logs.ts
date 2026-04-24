import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('cupping_logs');
  if (!exists) {
    await knex.schema.createTable('cupping_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.date('visit_date').notNullable();
      table.uuid('client_id').nullable().references('id').inTable('clients').onDelete('SET NULL');
      table.string('roastery_name', 200).nullable();
      table.string('contact_person', 100).nullable();
      table.text('offered_beans').nullable();
      table.text('reaction').nullable();
      table.string('purchase_intent', 20).notNullable().defaultTo('none');
      table.date('followup_date').nullable();
      table.boolean('followup_notified').notNullable().defaultTo(false);
      table.text('notes').nullable();
      table.string('workspace', 100).notNullable();
      table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['workspace'], 'idx_cupping_logs_workspace');
      table.index(['client_id'], 'idx_cupping_logs_client_id');
      table.index(['visit_date'], 'idx_cupping_logs_visit_date');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('cupping_logs');
}
