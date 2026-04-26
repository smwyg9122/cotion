import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create activity_logs table
  const hasActivityLogs = await knex.schema.hasTable('activity_logs');
  if (!hasActivityLogs) {
    await knex.schema.createTable('activity_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('action', 50).notNullable(); // 'page_create', 'page_update', 'page_delete', 'project_create', 'project_delete', 'event_create', 'client_create', 'user_login', etc.
      table.string('target_type', 50); // 'page', 'project', 'event', 'client', 'user'
      table.uuid('target_id');
      table.text('details'); // JSON stringified extra info
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index(['user_id'], 'idx_activity_logs_user_id');
      table.index(['action'], 'idx_activity_logs_action');
      table.index(['created_at'], 'idx_activity_logs_created_at');
    });
  }

  // Create kakao_notification_logs table
  const hasKakaoLogs = await knex.schema.hasTable('kakao_notification_logs');
  if (!hasKakaoLogs) {
    await knex.schema.createTable('kakao_notification_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('type', 100); // notification type/title
      table.text('message');
      table.string('status', 20).defaultTo('sent'); // 'sent', 'failed'
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index(['user_id'], 'idx_kakao_logs_user_id');
      table.index(['created_at'], 'idx_kakao_logs_created_at');
    });
  }

  // Create workspaces table
  const hasWorkspaces = await knex.schema.hasTable('workspaces');
  if (!hasWorkspaces) {
    await knex.schema.createTable('workspaces', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 100).notNullable().unique();
      table.text('description');
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // Seed existing workspaces
    await knex('workspaces').insert([
      { name: '아유타', description: '아유타 워크스페이스' },
      { name: '제이로텍', description: '제이로텍 워크스페이스' },
    ]);
  }

  // Add is_active column to users table
  const hasIsActive = await knex.schema.hasColumn('users', 'is_active');
  if (!hasIsActive) {
    await knex.schema.table('users', (table) => {
      table.boolean('is_active').defaultTo(true);
    });
    // Set all existing users as active
    await knex('users').update({ is_active: true });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove is_active column from users
  const hasIsActive = await knex.schema.hasColumn('users', 'is_active');
  if (hasIsActive) {
    await knex.schema.table('users', (table) => {
      table.dropColumn('is_active');
    });
  }

  await knex.schema.dropTableIfExists('workspaces');
  await knex.schema.dropTableIfExists('kakao_notification_logs');
  await knex.schema.dropTableIfExists('activity_logs');
}
