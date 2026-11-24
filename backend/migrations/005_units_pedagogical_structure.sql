-- 005_units_pedagogical_structure.sql
-- Estructura pedagógica completa: Material de Estudio, Material Complementario, Actividades, Foros y Evaluaciones

-- 1. Modificar tabla lessons para actuar como Unidad Pedagógica con enlaces y material de estudio
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS published_needs_video;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS study_material_url text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS study_material_content text;

-- 2. Clasificación de recursos (material de estudio vs complementario)
ALTER TABLE resources ADD COLUMN IF NOT EXISTS material_category text NOT NULL DEFAULT 'complementary';

-- 3. Actividades Prácticas de la Unidad
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
CREATE INDEX IF NOT EXISTS idx_unit_activities_lesson ON unit_activities(lesson_id);

-- 4. Entregas de Actividades por Estudiantes
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
CREATE INDEX IF NOT EXISTS idx_activity_submissions_activity ON activity_submissions(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_submissions_user ON activity_submissions(user_id);

-- 5. Foros de Discusión de la Unidad (1 por unidad)
CREATE TABLE IF NOT EXISTS unit_forums (
  id          BIGSERIAL PRIMARY KEY,
  lesson_id   BIGINT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  is_closed   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_unit_forums_lesson ON unit_forums(lesson_id);

-- 6. Mensajes y Respuestas del Foro
CREATE TABLE IF NOT EXISTS forum_messages (
  id          BIGSERIAL PRIMARY KEY,
  forum_id    BIGINT NOT NULL REFERENCES unit_forums(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id   BIGINT REFERENCES forum_messages(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forum_messages_forum ON forum_messages(forum_id);
CREATE INDEX IF NOT EXISTS idx_forum_messages_user ON forum_messages(user_id);

-- 7. Evaluaciones / Cuestionarios de la Unidad (1 por unidad)
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
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON quizzes(lesson_id);

-- 8. Preguntas de la Evaluación
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
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);

-- 9. Opciones de Respuesta
CREATE TABLE IF NOT EXISTS quiz_options (
  id          BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct  BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_quiz_options_question ON quiz_options(question_id);

-- 10. Intentos y Calificaciones de los Estudiantes
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
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_user ON quiz_attempts(quiz_id, user_id);
