import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 김준성(admin4)은 아유타 워크스페이스에 참가하지 않으므로 제이로텍만 허용
  await knex('users')
    .where({ username: 'admin4' })
    .update({ allowed_workspaces: JSON.stringify(['제이로텍']) });
}

export async function down(knex: Knex): Promise<void> {
  await knex('users')
    .where({ username: 'admin4' })
    .update({ allowed_workspaces: JSON.stringify(['아유타', '제이로텍']) });
}
