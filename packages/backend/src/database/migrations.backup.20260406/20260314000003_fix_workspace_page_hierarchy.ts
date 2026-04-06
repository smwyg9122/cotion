import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if is_workspace column exists (from the old reverted migration)
  const hasIsWorkspace = await knex.schema.hasColumn('pages', 'is_workspace');

  if (hasIsWorkspace) {
    // Find workspace pages created by the old migration
    const workspacePages = await knex('pages')
      .where({ is_workspace: true })
      .select('id', 'title', 'path');

    for (const ws of workspacePages) {
      // Get children of this workspace page
      const children = await knex('pages')
        .where({ parent_id: ws.id })
        .orderBy('position');

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const oldPath = child.path;
        const childSanitizedId = child.id.replace(/-/g, '_');
        const newPath = `root.${childSanitizedId}`;

        // Move child to root level with category based on workspace
        const category = ws.title === '제이로텍' ? '제이로텍' : '아유타';
        await knex('pages')
          .where({ id: child.id })
          .update({
            parent_id: null,
            path: newPath,
            position: i,
            category: category,
          });

        // Update all descendants' paths
        if (oldPath) {
          const descendants = await knex('pages')
            .whereRaw('path <@ ?::ltree AND id != ?', [oldPath, child.id])
            .select('id', 'path');

          if (descendants.length > 0) {
            await knex.raw(
              `UPDATE pages
               SET path = ?::ltree || subpath(path, nlevel(?::ltree))
               WHERE path <@ ?::ltree AND id != ?`,
              [newPath, oldPath, oldPath, child.id]
            );
          }
        }
      }
    }

    // Delete workspace pages
    if (workspacePages.length > 0) {
      await knex('pages')
        .where({ is_workspace: true })
        .delete();
    }

    // Drop is_workspace column
    await knex.schema.alterTable('pages', (table) => {
      table.dropColumn('is_workspace');
    });
  }

  // Final safety: set category='아유타' for any root pages still without proper category
  await knex('pages')
    .whereNull('parent_id')
    .andWhere(function () {
      this.whereNull('category')
        .orWhere('category', '')
        .orWhereNotIn('category', ['아유타', '제이로텍']);
    })
    .update({ category: '아유타' });
}

export async function down(knex: Knex): Promise<void> {
  // Cannot reliably revert this structural fix
}
