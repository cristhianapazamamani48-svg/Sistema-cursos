import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

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
