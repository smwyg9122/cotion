import { Knex } from 'knex';

/**
 * Two scope-limited safety improvements for ayuta_buyers:
 *
 *  1. Switch created_by FK from CASCADE → SET NULL so deleting an admin
 *     user does not nuke every buyer record they ever created.
 *
 *  2. Add a CHECK constraint that pins workspace to the single value
 *     '아유타' for this Ayuta-only CRM. Prevents typo-driven orphan rows
 *     and accidental cross-tenant inserts.
 *
 * Both changes are idempotent. They only apply to the ayuta_buyers table —
 * fixing the same patterns in legacy tables (clients, inventory, etc.) is
 * tracked separately because it's higher-blast-radius.
 */

const FK_NAME = 'ayuta_buyers_created_by_foreign';
const CHECK_NAME = 'ayuta_buyers_workspace_check';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('ayuta_buyers');
  if (!hasTable) return; // nothing to alter

  // --- (1) created_by: CASCADE → SET NULL ---------------------------------
  // Drop existing FK (if it exists) and recreate with SET NULL.
  // Make column nullable first because SET NULL requires NULLable target.
  await knex.schema.alterTable('ayuta_buyers', (table) => {
    table.uuid('created_by').nullable().alter();
  });

  // Drop the auto-named FK if present, then re-add. Use raw to be tolerant
  // of historical naming differences.
  await knex.raw(`ALTER TABLE ayuta_buyers DROP CONSTRAINT IF EXISTS ${FK_NAME}`);
  await knex.schema.alterTable('ayuta_buyers', (table) => {
    table
      .foreign('created_by', FK_NAME)
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
  });

  // --- (2) workspace CHECK constraint -------------------------------------
  await knex.raw(`ALTER TABLE ayuta_buyers DROP CONSTRAINT IF EXISTS ${CHECK_NAME}`);
  await knex.raw(`ALTER TABLE ayuta_buyers ADD CONSTRAINT ${CHECK_NAME} CHECK (workspace = '아유타')`);
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('ayuta_buyers');
  if (!hasTable) return;

  // Remove CHECK
  await knex.raw(`ALTER TABLE ayuta_buyers DROP CONSTRAINT IF EXISTS ${CHECK_NAME}`);

  // Revert created_by FK to CASCADE + notNullable. NOTE: any rows whose
  // created_by is NULL at this point would block the alter — accept that
  // risk on rollback (knex will surface the error).
  await knex.raw(`ALTER TABLE ayuta_buyers DROP CONSTRAINT IF EXISTS ${FK_NAME}`);
  await knex.schema.alterTable('ayuta_buyers', (table) => {
    table.uuid('created_by').notNullable().alter();
    table
      .foreign('created_by', FK_NAME)
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
  });
}
