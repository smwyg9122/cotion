import { Knex } from 'knex';

/**
 * Two scope-limited safety improvements for ayuta_buyers:
 *
 *  1. Switch created_by FK from CASCADE → SET NULL so deleting an admin
 *     user does not nuke every buyer record they ever created.
 *
 *  2. Add a CHECK constraint that pins workspace to the single value
 *     '아유타' for this Ayuta-only CRM.
 *
 * IMPORTANT — bulletproof against production data:
 * knex runs migrations sequentially and ABORTS the whole chain on the
 * first failure. If this migration throws on real data (e.g. a workspace
 * value that violates the CHECK constraint), every LATER migration
 * (including enrich_clients) never runs, leaving the clients table without
 * its new columns → every client write 500s. So every risky step here is
 * individually guarded: a failure logs and continues instead of aborting.
 */

const FK_NAME = 'ayuta_buyers_created_by_foreign';
const CHECK_NAME = 'ayuta_buyers_workspace_check';

async function safe(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[harden_ayuta_buyers] step "${label}" skipped:`, (err as Error).message);
  }
}

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('ayuta_buyers');
  if (!hasTable) return; // nothing to alter

  // --- (1) created_by: CASCADE → SET NULL --------------------------------
  await safe('created_by nullable', async () => {
    await knex.schema.alterTable('ayuta_buyers', (table) => {
      table.uuid('created_by').nullable().alter();
    });
  });

  await safe('drop old FK', async () => {
    await knex.raw(`ALTER TABLE ayuta_buyers DROP CONSTRAINT IF EXISTS ${FK_NAME}`);
  });

  await safe('add SET NULL FK', async () => {
    await knex.schema.alterTable('ayuta_buyers', (table) => {
      table
        .foreign('created_by', FK_NAME)
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
    });
  });

  // --- (2) workspace CHECK constraint ------------------------------------
  // Only add the constraint when NO existing row would violate it. If any
  // row has a different workspace, skip (the app-layer workspace ACL still
  // protects access). Never let this abort the migration chain.
  await safe('workspace CHECK', async () => {
    await knex.raw(`ALTER TABLE ayuta_buyers DROP CONSTRAINT IF EXISTS ${CHECK_NAME}`);
    const [{ count }] = await knex('ayuta_buyers')
      .whereNot('workspace', '아유타')
      .count<{ count: string }[]>('id as count');
    const violating = parseInt(String(count), 10) || 0;
    if (violating === 0) {
      await knex.raw(
        `ALTER TABLE ayuta_buyers ADD CONSTRAINT ${CHECK_NAME} CHECK (workspace = '아유타')`
      );
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `[harden_ayuta_buyers] ${violating} rows violate workspace='아유타'; CHECK skipped.`
      );
    }
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('ayuta_buyers');
  if (!hasTable) return;

  await safe('drop CHECK', async () => {
    await knex.raw(`ALTER TABLE ayuta_buyers DROP CONSTRAINT IF EXISTS ${CHECK_NAME}`);
  });

  await safe('revert FK', async () => {
    await knex.raw(`ALTER TABLE ayuta_buyers DROP CONSTRAINT IF EXISTS ${FK_NAME}`);
    await knex.schema.alterTable('ayuta_buyers', (table) => {
      table
        .foreign('created_by', FK_NAME)
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
    });
  });
}
