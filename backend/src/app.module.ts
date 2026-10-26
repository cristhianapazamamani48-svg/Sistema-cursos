import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { existsSync } from 'fs';
import { validateEnv } from './config/env.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { LessonsModule } from './lessons/lessons.module';
import { ProgressModule } from './progress/progress.module';
import { OrdersModule } from './orders/orders.module';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';

// Ruta donde el Dockerfile copiará el build del frontend
const FRONTEND_BUILD_PATH = join(__dirname, '..', 'public');
const frontendExists = existsSync(FRONTEND_BUILD_PATH);

const staticModule = frontendExists
  ? [
      ServeStaticModule.forRoot({
        rootPath: FRONTEND_BUILD_PATH,
        exclude: ['/api/(.*)'],
      }),
    ]
  : [];

@Module({
  imports: [
    ...staticModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    AuthModule,
    CoursesModule,
    LessonsModule,
    ProgressModule,
    OrdersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
