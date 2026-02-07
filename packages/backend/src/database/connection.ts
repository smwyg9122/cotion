import knex, { Knex } from 'knex';
import { config } from '../config';

const knexConfig: Knex.Config = {
  client: 'postgresql',
  connection: config.database.url,
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: './migrations',
    extension: 'ts',
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
