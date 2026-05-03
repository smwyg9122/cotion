import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || {
      host: 'localhost',
      port: 5432,
      database: 'cotion_dev',
      user: 'postgres',
      password: 'postgres',
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: path.join(__dirname, 'src/database/migrations'),
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
    seeds: {
      directory: path.join(__dirname, 'src/database/seeds'),
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: path.join(__dirname, 'database/migrations'),
      extension: isProduction ? 'js' : 'ts',
      loadExtensions: isProduction ? ['.js'] : ['.ts'],
    },
  },
};

export default config;
