import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('type', 50).notNullable();
    table.text('message').notNullable();
    table.uuid('page_id').nullable().references('id').inTable('pages').onDelete('CASCADE');
    table.uuid('triggered_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('user_id', 'idx_notifications_user_id');
    table.index(['user_id', 'is_read'], 'idx_notifications_user_unread');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notifications');
}
