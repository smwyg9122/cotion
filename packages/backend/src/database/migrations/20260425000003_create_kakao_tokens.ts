import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('kakao_tokens');
  if (!exists) {
    await knex.schema.createTable('kakao_tokens', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.unique(['user_id']);
      table.text('access_token').notNullable();
      table.text('refresh_token').notNullable();
      table.timestamp('expires_at').notNullable();
      table.string('kakao_user_id', 100).nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('kakao_tokens');
}
