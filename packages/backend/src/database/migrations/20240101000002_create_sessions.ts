import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('refresh_token', 500).notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.string('ip_address', 45).nullable();
    table.text('user_agent').nullable();

    // Indexes
    table.index('user_id', 'idx_sessions_user_id');
    table.index('refresh_token', 'idx_sessions_refresh_token');
    table.index('expires_at', 'idx_sessions_expires_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sessions');
}
