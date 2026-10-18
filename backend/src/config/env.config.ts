import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_NAME: z.string().default('plataforma_cursos'),
  DATABASE_URL: z.string().optional(),

  SESSION_SECRET: z.string().min(16),
  SESSION_COOKIE_NAME: z.string().default('sid'),
  SESSION_MAX_AGE_DAYS: z.coerce.number().default(30),
  CSRF_SECRET: z.string().min(16),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.error('❌ Error de validación de variables de entorno:', result.error.format());
    throw new Error('Configuración de entorno inválida');
  }
  return result.data;
}
