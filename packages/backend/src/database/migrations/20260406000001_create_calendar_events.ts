import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create calendar_events table
  await knex.schema.createTable('calendar_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title', 200).notNullable();
    table.text('description');
    table.timestamp('start_date').notNullable();
    table.timestamp('end_date');
    table.boolean('all_day').notNullable().defaultTo(true);
    table.string('color', 20);
    table.string('workspace', 100).notNullable();
    table.uuid('page_id').references('id').inTable('pages').onDelete('SET NULL');
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['workspace'], 'idx_calendar_events_workspace');
    table.index(['start_date', 'end_date'], 'idx_calendar_events_dates');
    table.index(['page_id'], 'idx_calendar_events_page_id');
    table.index(['created_by'], 'idx_calendar_events_created_by');
  });

  // Create trigger for updating updated_at
  await knex.raw(`
    CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // Add deadline column to pages table
  await knex.schema.alterTable('pages', (table) => {
    table.timestamp('deadline').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('pages', (table) => {
    table.dropColumn('deadline');
  });
  await knex.raw('DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;');
  await knex.schema.dropTableIfExists('calendar_events');
}
