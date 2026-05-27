import { Knex } from 'knex';

/**
 * Composite index on pages(workspace, is_deleted) to keep the
 * workspace-scoped page list / search / tree queries fast as the
 * dataset grows. PagesService now filters by both columns on nearly
 * every read path (after the workspace ACL refactor), so this is
 * the natural index to add.
 *
 * Uses `CREATE INDEX IF NOT EXISTS` for idempotence — safe to re-run.
 */
export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('pages');
  if (!hasTable) return;

  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_pages_workspace_is_deleted ON pages (workspace, is_deleted)'
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS idx_pages_workspace_is_deleted');
}
