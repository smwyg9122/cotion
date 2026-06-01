import knex, { Knex } from 'knex';
import path from 'path';
import { config } from '../config';

const isProduction = process.env.NODE_ENV === 'production';

const knexConfig: Knex.Config = {
  client: 'postgresql',
  connection: isProduction
    ? { connectionString: config.database.url, ssl: { rejectUnauthorized: false } }
    : config.database.url,
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    extension: isProduction ? 'js' : 'ts',
    loadExtensions: isProduction ? ['.js'] : ['.ts'],
    // CRITICAL: production's knex_migrations table records an old migration
    // name (20260425000003_create_superadmin) that was later renamed to
    // 20260425000004 in commit 6466a31 to fix a timestamp collision. Since
    // the old file no longer exists, knex would otherwise throw "The
    // migration directory is corrupt, the following files are missing: …"
    // and refuse to run ANY pending migration. That blocked every migration
    // added afterward (ayuta_buyers, clients enrichment, etc.) from ever
    // reaching production → missing columns → write 500s.
    //
    // This flag tells knex to ignore already-applied migrations whose files
    // are gone and just run the pending ones. Safe because those old
    // migrations did apply successfully; we only removed/renamed the files.
    disableMigrationsListValidation: true,
  },
};

export const db = knex(knexConfig);

export async function testConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
