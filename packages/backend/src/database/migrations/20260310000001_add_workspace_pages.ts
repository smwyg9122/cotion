import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add is_workspace column to pages
  await knex.schema.alterTable('pages', (table) => {
    table.boolean('is_workspace').defaultTo(false);
  });

  // Find the first user to set as creator
  const firstUser = await knex('users').first('id');
  const userId = firstUser?.id;

  if (!userId) {
    return;
  }

  // 1.5 Fix any root pages with broken path = 'root' (should be 'root.<sanitized_id>')
  const brokenPathPages = await knex('pages')
    .where({ path: 'root' })
    .select('id');

  for (const page of brokenPathPages) {
    const sanitizedId = page.id.replace(/-/g, '_');
    await knex('pages')
      .where({ id: page.id })
      .update({ path: `root.${sanitizedId}` });
  }

  // 2. Create "아유타" workspace page
  const [ayutaPage] = await knex('pages')
    .insert({
      title: '아유타',
      content: '',
      icon: '☕',
      parent_id: null,
      category: null,
      created_by: userId,
      updated_by: userId,
      position: 0,
      path: 'root',
      is_deleted: false,
      is_workspace: true,
    })
    .returning('*');

  const ayutaSanitizedId = ayutaPage.id.replace(/-/g, '_');
  const ayutaPath = `root.${ayutaSanitizedId}`;
  await knex('pages').where({ id: ayutaPage.id }).update({ path: ayutaPath });

  // 3. Create "제이로텍" workspace page
  const [jrotechPage] = await knex('pages')
    .insert({
      title: '제이로텍',
      content: '',
      icon: '🏢',
      parent_id: null,
      category: null,
      created_by: userId,
      updated_by: userId,
      position: 1,
      path: 'root',
      is_deleted: false,
      is_workspace: true,
    })
    .returning('*');

  const jrotechSanitizedId = jrotechPage.id.replace(/-/g, '_');
  const jrotechPath = `root.${jrotechSanitizedId}`;
  await knex('pages').where({ id: jrotechPage.id }).update({ path: jrotechPath });

  // 4. Move all existing root pages (non-workspace) under 아유타
  const existingRootPages = await knex('pages')
    .whereNull('parent_id')
    .where('id', '!=', ayutaPage.id)
    .where('id', '!=', jrotechPage.id)
    .orderBy('position');

  for (let i = 0; i < existingRootPages.length; i++) {
    const page = existingRootPages[i];
    const oldPath = page.path;
    const pageSanitizedId = page.id.replace(/-/g, '_');
    const newPath = `${ayutaPath}.${pageSanitizedId}`;

    // Update the page itself
    await knex('pages')
      .where({ id: page.id })
      .update({
        parent_id: ayutaPage.id,
        path: newPath,
        position: i,
      });

    // Update descendants only if the page has any (check nlevel > 1 for the old path)
    // The old path must be specific enough (not just 'root') to avoid matching everything
    const descendantCount = await knex('pages')
      .whereRaw('path <@ ?::ltree AND id != ?', [oldPath, page.id])
      .count('* as cnt')
      .first();

    if (descendantCount && Number(descendantCount.cnt) > 0) {
      await knex.raw(
        `
        UPDATE pages
        SET path = ?::ltree || subpath(path, nlevel(?::ltree))
        WHERE path <@ ?::ltree AND id != ?
        `,
        [newPath, oldPath, oldPath, page.id]
      );
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Check if is_workspace column exists
  const hasColumn = await knex.schema.hasColumn('pages', 'is_workspace');
  if (!hasColumn) return;

  // Find the 아유타 workspace
  const ayuta = await knex('pages')
    .where({ title: '아유타', is_workspace: true })
    .first();

  if (ayuta) {
    // Move children back to root
    const children = await knex('pages')
      .where({ parent_id: ayuta.id })
      .orderBy('position');

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const oldPath = child.path;
      const childSanitizedId = child.id.replace(/-/g, '_');
      const newPath = `root.${childSanitizedId}`;

      await knex('pages')
        .where({ id: child.id })
        .update({
          parent_id: null,
          path: newPath,
          position: i,
        });

      const descendantCount = await knex('pages')
        .whereRaw('path <@ ?::ltree AND id != ?', [oldPath, child.id])
        .count('* as cnt')
        .first();

      if (descendantCount && Number(descendantCount.cnt) > 0) {
        await knex.raw(
          `
          UPDATE pages
          SET path = ?::ltree || subpath(path, nlevel(?::ltree))
          WHERE path <@ ?::ltree AND id != ?
          `,
          [newPath, oldPath, oldPath, child.id]
        );
      }
    }

    // Delete workspace pages
    await knex('pages').where({ is_workspace: true }).delete();
  }

  // Remove is_workspace column
  await knex.schema.alterTable('pages', (table) => {
    table.dropColumn('is_workspace');
  });
}
