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

          CREATE TABLE IF NOT EXISTS certificates (
            id             BIGSERIAL PRIMARY KEY,
            code           VARCHAR(36) NOT NULL UNIQUE,
            enrollment_id  BIGINT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
            user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            course_id      BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            student_name   TEXT NOT NULL,
            course_title   TEXT NOT NULL,
            workload_hours INTEGER NOT NULL DEFAULT 40,
            issued_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_certificates_enrollment UNIQUE (enrollment_id)
          );
          CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(code);

          -- Estructura pedagógica: material de estudio, actividades, foros y evaluaciones
          ALTER TABLE lessons DROP CONSTRAINT IF EXISTS published_needs_video;
          ALTER TABLE lessons ADD COLUMN IF NOT EXISTS study_material_url text;
          ALTER TABLE lessons ADD COLUMN IF NOT EXISTS study_material_content text;
          ALTER TABLE resources ADD COLUMN IF NOT EXISTS material_category text NOT NULL DEFAULT 'complementary';

          CREATE TABLE IF NOT EXISTS unit_activities (
            id           BIGSERIAL PRIMARY KEY,
            lesson_id    BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
            title        TEXT NOT NULL,
            description  TEXT,
            instructions TEXT,
            due_date     TIMESTAMPTZ,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS activity_submissions (
            id           BIGSERIAL PRIMARY KEY,
            activity_id  BIGINT NOT NULL REFERENCES unit_activities(id) ON DELETE CASCADE,
            user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content      TEXT,
            file_url     TEXT,
            grade        NUMERIC(5,2),
            feedback     TEXT,
            status       TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned')),
            submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_activity_user UNIQUE (activity_id, user_id)
          );

          CREATE TABLE IF NOT EXISTS unit_forums (
            id          BIGSERIAL PRIMARY KEY,
            lesson_id   BIGINT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
            title       TEXT NOT NULL,
            description TEXT,
            is_closed   BOOLEAN NOT NULL DEFAULT false,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS forum_messages (
            id          BIGSERIAL PRIMARY KEY,
            forum_id    BIGINT NOT NULL REFERENCES unit_forums(id) ON DELETE CASCADE,
            user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            parent_id   BIGINT REFERENCES forum_messages(id) ON DELETE CASCADE,
            message     TEXT NOT NULL,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS quizzes (
            id              BIGSERIAL PRIMARY KEY,
            lesson_id       BIGINT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
            title           TEXT NOT NULL,
            description     TEXT,
            passing_score   INTEGER NOT NULL DEFAULT 70,
            max_attempts    INTEGER NOT NULL DEFAULT 3,
            time_limit_mins INTEGER,
            is_published    BOOLEAN NOT NULL DEFAULT true,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS quiz_questions (
            id            BIGSERIAL PRIMARY KEY,
            quiz_id       BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            question_text TEXT NOT NULL,
            question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
            points        INTEGER NOT NULL DEFAULT 1,
            order_index   INTEGER NOT NULL DEFAULT 1,
            explanation   TEXT,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS quiz_options (
            id          BIGSERIAL PRIMARY KEY,
            question_id BIGINT NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
            option_text TEXT NOT NULL,
            is_correct  BOOLEAN NOT NULL DEFAULT false,
            order_index INTEGER NOT NULL DEFAULT 1
          );

          CREATE TABLE IF NOT EXISTS quiz_attempts (
            id             BIGSERIAL PRIMARY KEY,
            quiz_id        BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            score          NUMERIC(5,2) NOT NULL DEFAULT 0,
            passed         BOOLEAN NOT NULL DEFAULT false,
            answers        JSONB NOT NULL DEFAULT '{}'::jsonb,
            attempt_number INTEGER NOT NULL DEFAULT 1,
            completed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
          );

          -- Perfil de usuario extendido
          ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
        `)
        .catch(() => { });

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
