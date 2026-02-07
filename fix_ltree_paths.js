require('dotenv').config({ path: './packages/backend/.env' });
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/cotion_dev',
});

async function fixLtreePaths() {
  try {
    console.log('🔍 Checking existing pages...');

    // Get all pages
    const pages = await db('pages')
      .where({ is_deleted: false })
      .orderBy('created_at')
      .select('*');

    console.log(`Found ${pages.length} pages`);

    for (const page of pages) {
      console.log(`\nPage: ${page.title}`);
      console.log(`  Current path: ${page.path}`);

      // Check if path contains hyphens
      if (page.path && page.path.includes('-')) {
        // Sanitize the path by replacing hyphens with underscores
        const newPath = page.path.replace(/-/g, '_');
        console.log(`  ⚠️  Invalid path detected! Fixing to: ${newPath}`);

        await db('pages')
          .where({ id: page.id })
          .update({ path: newPath });

        console.log(`  ✅ Path fixed!`);
      } else {
        console.log(`  ✓ Path is valid`);
      }
    }

    console.log('\n✅ All paths have been fixed!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

fixLtreePaths();
