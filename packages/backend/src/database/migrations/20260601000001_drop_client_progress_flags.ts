import { Knex } from 'knex';

/**
 * Removes the three boolean "progress" flags from clients:
 *   visited (방문여부), cupping_done (커핑진행), purchased (구매여부)
 *
 * Per product decision, these checkbox-only fields added little value over
 * the richer `status` enum (신규/진행중/정기거래/휴면/중단). Visit/cupping/
 * purchase dates, if needed, go in the free-text `notes` field instead.
 *
 * Bulletproof: each drop is guarded by hasColumn so a partial/re-run can't
 * abort the migration chain.
 */

const COLUMNS = ['visited', 'cupping_done', 'purchased'];

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('clients');
  if (!hasTable) return;

  for (const col of COLUMNS) {
    if (await knex.schema.hasColumn('clients', col)) {
      try {
        await knex.schema.alterTable('clients', (table) => {
          table.dropColumn(col);
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[drop_client_progress_flags] drop ${col} failed:`, (err as Error).message);
      }
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('clients');
  if (!hasTable) return;

  // Re-create the columns (default false) if rolled back.
  for (const col of COLUMNS) {
    if (!(await knex.schema.hasColumn('clients', col))) {
      await knex.schema.alterTable('clients', (table) => {
        table.boolean(col).notNullable().defaultTo(false);
      });
    }
  }
}
