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
      return new Pool({
        connectionString,
      });
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
