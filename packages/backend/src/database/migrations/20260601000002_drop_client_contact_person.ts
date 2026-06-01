import { Knex } from 'knex';

/**
 * Removes clients.contact_person (담당자).
 *
 * Per product decision it overlapped with `assigned_to` (담당자 배정 — the
 * team member responsible for the client). Only 담당자 배정 is kept.
 *
 * Bulletproof: guarded by hasColumn so a partial/re-run can't abort the
 * migration chain. down() restores the column (nullable).
 */

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('clients');
  if (!hasTable) return;

  if (await knex.schema.hasColumn('clients', 'contact_person')) {
    try {
      await knex.schema.alterTable('clients', (table) => {
        table.dropColumn('contact_person');
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[drop_client_contact_person] drop failed:', (err as Error).message);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('clients');
  if (!hasTable) return;

  if (!(await knex.schema.hasColumn('clients', 'contact_person'))) {
    await knex.schema.alterTable('clients', (table) => {
      table.string('contact_person', 100).nullable();
    });
  }
}
