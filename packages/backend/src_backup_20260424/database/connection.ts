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
