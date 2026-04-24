import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add title (직책) column to users
  const hasTitle = await knex.schema.hasColumn('users', 'title');
  if (!hasTitle) {
    await knex.schema.alterTable('users', (table) => {
      table.string('title', 50).nullable();
    });
  }

  // Update admin2 name: 김전무 → 김준희
  await knex('users')
    .where({ username: 'admin2' })
    .update({ name: '김준희' });

  // Set titles for Ayuta team members
  await knex('users').where({ username: 'admin1' }).update({ title: '대표' });
  await knex('users').where({ username: 'admin2' }).update({ title: '전무' });
  await knex('users').where({ username: 'admin3' }).update({ title: '상무' });
}

export async function down(knex: Knex): Promise<void> {
  // Revert admin2 name
  await knex('users')
    .where({ username: 'admin2' })
    .update({ name: '김전무' });

  const hasTitle = await knex.schema.hasColumn('users', 'title');
  if (hasTitle) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('title');
    });
  }
}
