import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if adminadmin already exists
  const existing = await knex('users').where({ username: 'adminadmin' }).first();
  if (existing) return;

  await knex('users').insert({
    username: 'adminadmin',
    email: 'superadmin@cotion.app',
    password_hash: '$2b$12$9lEhd.0.UxJqzaeHH3q3fuby5yJXWdpKFfD7HbnkZqYemdLof6tnq',
    name: '슈퍼관리자',
    role: 'superadmin',
    allowed_workspaces: JSON.stringify(['아유타', '제이로텍']),
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex('users').where({ username: 'adminadmin' }).delete();
}
