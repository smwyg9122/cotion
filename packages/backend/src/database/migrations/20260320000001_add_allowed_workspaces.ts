import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasAllowedWorkspaces = await knex.schema.hasColumn('users', 'allowed_workspaces');
  if (!hasAllowedWorkspaces) {
    await knex.schema.table('users', (table) => {
      table.text('allowed_workspaces').nullable().defaultTo('["아유타","제이로텍"]');
    });
  }

  // Update all existing users to have allowed_workspaces set
  await knex('users')
    .whereNull('allowed_workspaces')
    .update({ allowed_workspaces: '["아유타","제이로텍"]' });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.dropColumn('allowed_workspaces');
  });
}
