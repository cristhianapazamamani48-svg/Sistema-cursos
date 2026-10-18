import { Module, Global } from '@nestjs/common';
import { databaseProviders, DRIZZLE_DB, PG_POOL } from './database.provider';

@Global()
@Module({
  providers: [...databaseProviders],
  exports: [DRIZZLE_DB, PG_POOL],
})
export class DatabaseModule {}
