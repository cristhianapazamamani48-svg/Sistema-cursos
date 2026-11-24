import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Trust proxy para proxies inversos (Railway, Docker, Nginx)
  app.set('trust proxy', 1);

  // Cabeceras de seguridad con Helmet
  app.use(helmet({ contentSecurityPolicy: false }));

  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
  const port = configService.get<number>('PORT', 3000);

  // Prefijo global de API
  app.setGlobalPrefix('api');

  // Habilitar cookie-parser
  app.use(cookieParser());

  // Habilitar CORS con credenciales para intercambio de cookies httpOnly
  app.enableCors({
    origin: [frontendUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'csrf-token'],
  });

  await app.listen(port);
  console.log(`🚀 Servidor ejecutándose en http://localhost:${port}/api`);
}

bootstrap();
