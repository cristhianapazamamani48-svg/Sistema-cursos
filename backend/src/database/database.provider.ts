import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, types } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const DRIZZLE_DB = 'DRIZZLE_DB';
export const PG_POOL = 'PG_POOL';

export type DrizzleDb = NodePgDatabase<typeof schema>;

export const databaseProviders: Provider[] = [
  {
    provide: PG_POOL,
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
      const connectionString =
        configService.get<string>('DATABASE_URL') ||
        `postgresql://${configService.get<string>('DB_USER')}:${configService.get<string>('DB_PASSWORD')}@${configService.get<string>('DB_HOST')}:${configService.get<number>('DB_PORT')}/${configService.get<string>('DB_NAME')}`;

      types.setTypeParser(20, Number);
      const pool = new Pool({
        connectionString,
      });

      // Asegurar columna category si ya existe la tabla courses
      pool
        .query('ALTER TABLE courses ADD COLUMN IF NOT EXISTS category text;')
        .catch(() => {});

      // Asegurar duration_seconds nullable y check para videos pendientes
      pool
        .query(`
          ALTER TABLE videos ALTER COLUMN duration_seconds DROP NOT NULL;
          ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_duration_seconds_check;
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'videos_approved_duration_check'
            ) THEN
              ALTER TABLE videos ADD CONSTRAINT videos_approved_duration_check
                CHECK (status <> 'approved' OR duration_seconds > 0);
            END IF;
          END $$;
        `)
        .catch(() => {});

      return pool;
    },
  },
  {
    provide: DRIZZLE_DB,
    inject: [PG_POOL],
    useFactory: (pool: Pool): DrizzleDb => {
      return drizzle(pool, { schema });
    },
  },
];
