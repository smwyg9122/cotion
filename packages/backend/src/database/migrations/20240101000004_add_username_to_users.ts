import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // username 컬럼 추가
  const hasUsername = await knex.schema.hasColumn('users', 'username');

  if (!hasUsername) {
    await knex.schema.alterTable('users', (table) => {
      table.string('username', 50).unique().notNullable().defaultTo('user');
    });
  }

  // 기존 사용자들에게 임시 username 부여 (email의 @ 앞부분)
  await knex.raw(`
    UPDATE users
    SET username = LOWER(SPLIT_PART(email, '@', 1))
    WHERE username = 'user' OR username IS NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('username');
  });
}
