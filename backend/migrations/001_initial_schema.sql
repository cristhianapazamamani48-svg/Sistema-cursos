-- =============================================================================
-- Plataforma de cursos virtuales: migración inicial (PostgreSQL 14+)
-- Incluye: usuarios/sesiones, cursos, videos, lecciones, inscripciones,
--          progreso por bloques, pagos y auditoría.
-- Fuera de esta migración (a propósito): grades, certificates.
-- Versión final tras dos rondas de revisión. Probar en un Postgres limpio antes de usar.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;

-- Mantiene updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. USUARIOS, SESIONES Y TOKENS
-- -----------------------------------------------------------------------------

-- Un usuario = un rol (cuentas separadas). Para ser admin y docente hacen
-- falta dos correos distintos.
CREATE TABLE users (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email             citext      NOT NULL UNIQUE,
  password_hash     text        NOT NULL,
  full_name         text        NOT NULL,
  avatar_url        text,
  role              text        NOT NULL
                    CHECK (role IN ('superadmin', 'admin', 'docente', 'estudiante')),
  is_active         boolean     NOT NULL DEFAULT true,
  email_verified_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Sesiones con cookie httpOnly. Se guarda el HASH del token, nunca el token.
CREATE TABLE sessions (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   text        NOT NULL UNIQUE,
  csrf_token   text        NOT NULL,
  ip           inet,
  user_agent   text,
  expires_at   timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx    ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

-- Verificación de correo y recuperación de contraseña (también solo hash)
CREATE TABLE user_tokens (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       text        NOT NULL CHECK (type IN ('verify_email', 'reset_password')),
  token_hash text        NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Un solo token activo por (usuario, tipo). La app invalida el anterior
-- (UPDATE ... SET used_at = now()) y crea el nuevo en la MISMA transacción.
CREATE UNIQUE INDEX user_tokens_one_active
  ON user_tokens (user_id, type) WHERE used_at IS NULL;

-- -----------------------------------------------------------------------------
-- 2. CURSOS Y ESTRUCTURA
-- -----------------------------------------------------------------------------

-- Gratis = price 0 (no hay columna is_free: una sola fuente de verdad)
CREATE TABLE courses (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title                text          NOT NULL,
  slug                 text          NOT NULL UNIQUE,
  description          text,
  thumbnail_url        text,
  price                numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency             text          NOT NULL DEFAULT 'BOB' CHECK (currency IN ('BOB', 'USD')),
  status               text          NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'published', 'archived')),
  min_watch_percentage integer       NOT NULL DEFAULT 85
                       CHECK (min_watch_percentage BETWEEN 1 AND 100),
  created_by           bigint        NOT NULL REFERENCES users(id),
  created_at           timestamptz   NOT NULL DEFAULT now(),
  updated_at           timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX courses_status_idx ON courses (status);

CREATE TABLE course_docentes (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id   bigint      NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id     bigint      NOT NULL REFERENCES users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);
CREATE INDEX course_docentes_user_idx ON course_docentes (user_id);

-- order_index sin UNIQUE a propósito: reordenar con UNIQUE obliga a hacer
-- malabares. La app reasigna los índices dentro de una transacción.
CREATE TABLE modules (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id   bigint      NOT NULL REFERENCES courses(id),
  title       text        NOT NULL,
  description text,
  order_index integer     NOT NULL,
  deleted_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX modules_course_order_idx ON modules (course_id, order_index)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 3. VIDEOS, LECCIONES Y RECURSOS
-- -----------------------------------------------------------------------------

-- duration_seconds es la FUENTE DE VERDAD para calcular el progreso.
-- La captura la app cuando el admin revisa el video (lectura con getDuration()
-- del reproductor o la API del proveedor). NO se toma del navegador del
-- estudiante: un cliente malicioso podría reportar una duración falsa.
CREATE TABLE videos (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title            text        NOT NULL,
  provider         text        NOT NULL CHECK (provider IN ('youtube', 'cloudflare', 'vimeo')),
  provider_ref     text        NOT NULL,
  duration_seconds integer     NOT NULL CHECK (duration_seconds > 0),
  uploaded_by      bigint      NOT NULL REFERENCES users(id),
  status           text        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by      bigint      REFERENCES users(id),
  reviewed_at      timestamptz,
  deleted_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rejected_needs_reason
    CHECK (status <> 'rejected' OR rejection_reason IS NOT NULL),
  CONSTRAINT reviewed_pair
    CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL))
);
CREATE UNIQUE INDEX videos_provider_ref_unique
  ON videos (provider, provider_ref) WHERE deleted_at IS NULL;
CREATE INDEX videos_status_idx      ON videos (status) WHERE deleted_at IS NULL;
CREATE INDEX videos_uploaded_by_idx ON videos (uploaded_by);

-- Regla que se valida en la APP (y no con trigger):
--   lessons.status = 'published' exige videos.status = 'approved'.
-- Si un video pasa a rejected, la app archiva las lecciones que lo usan.
-- video_id puede ser NULL mientras la lección esté en 'draft'; el CHECK
-- published_needs_video garantiza que una lección publicada siempre tiene video.
CREATE TABLE lessons (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  module_id   bigint      NOT NULL REFERENCES modules(id),
  video_id    bigint      REFERENCES videos(id),
  title       text        NOT NULL,
  description text,
  order_index integer     NOT NULL,
  status      text        NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT published_needs_video
    CHECK (status <> 'published' OR video_id IS NOT NULL)
);
CREATE INDEX lessons_module_order_idx ON lessons (module_id, order_index)
  WHERE deleted_at IS NULL;
CREATE INDEX lessons_video_idx ON lessons (video_id);

CREATE TABLE resources (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lesson_id   bigint      NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  type        text        NOT NULL CHECK (type IN ('pdf', 'link', 'image', 'other')),
  url         text        NOT NULL,
  order_index integer     NOT NULL DEFAULT 0,
  deleted_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resources_lesson_idx ON resources (lesson_id) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 4. PAGOS (van antes de enrollments porque ésta referencia a orders)
-- -----------------------------------------------------------------------------

-- amount se congela al crear la orden: nunca leer el precio actual del curso
-- para una orden existente. Cursos gratis = orden con amount 0 que se marca
-- paid automáticamente (un solo flujo).
CREATE TABLE orders (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      bigint        NOT NULL REFERENCES users(id),
  course_id    bigint        NOT NULL REFERENCES courses(id),
  amount       numeric(10,2) NOT NULL CHECK (amount >= 0),
  currency     text          NOT NULL CHECK (currency IN ('BOB', 'USD')),
  status       text          NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'expired')),
  -- Pago confirmado a mano por un admin (transferencia/QR con comprobante)
  confirmed_by bigint        REFERENCES users(id),
  confirmed_at timestamptz,
  receipt_url  text,
  created_at   timestamptz   NOT NULL DEFAULT now(),
  updated_at   timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT confirmed_pair
    CHECK ((confirmed_by IS NULL) = (confirmed_at IS NULL))
);
CREATE INDEX orders_user_status_idx   ON orders (user_id, status);
CREATE INDEX orders_course_idx        ON orders (course_id);
-- Máximo una orden pendiente y una pagada por (usuario, curso)
CREATE UNIQUE INDEX orders_one_pending_per_user_course
  ON orders (user_id, course_id) WHERE status = 'pending';
CREATE UNIQUE INDEX orders_one_paid_per_user_course
  ON orders (user_id, course_id) WHERE status = 'paid';

CREATE TABLE transactions (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id           bigint      NOT NULL REFERENCES orders(id),
  provider           text        NOT NULL
                     CHECK (provider IN ('qr_simple', 'tigo_money', 'yolo', 'card', 'bank_transfer', 'other')),
  provider_reference text,
  status             text        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'completed', 'failed')),
  raw_response       jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_order_idx ON transactions (order_id);
-- Idempotencia de webhooks: la misma referencia del proveedor no se duplica
CREATE UNIQUE INDEX transactions_provider_ref_unique
  ON transactions (provider, provider_reference) WHERE provider_reference IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 5. INSCRIPCIONES Y PROGRESO
-- -----------------------------------------------------------------------------

-- Acceso vitalicio. order_id es NULL cuando el admin inscribe manualmente
-- (en ese caso enrolled_by dice quién).
CREATE TABLE enrollments (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      bigint      NOT NULL REFERENCES users(id),
  course_id    bigint      NOT NULL REFERENCES courses(id),
  order_id     bigint      REFERENCES orders(id),
  enrolled_by  bigint      REFERENCES users(id),
  status       text        NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'completed', 'cancelled')),
  enrolled_at  timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id),
  CONSTRAINT completed_has_date
    CHECK (status <> 'completed' OR completed_at IS NOT NULL),
  -- La inscripción viene de una orden O de un admin, nunca de ambas ni de ninguna.
  CONSTRAINT enrollment_origin
    CHECK ((order_id IS NULL) <> (enrolled_by IS NULL))
);
-- Recompra tras reembolso: la fila vieja (cancelled) se REACTIVA con un upsert
-- (ver consulta E al final); así lesson_progress se conserva porque el
-- enrollment_id no cambia.
CREATE INDEX enrollments_user_idx   ON enrollments (user_id);
CREATE INDEX enrollments_course_idx ON enrollments (course_id);

-- Progreso por BLOQUES de 10 s:
--   * watched_blocks = índices (0-based) de bloques ya reproducidos, sin repetir.
--   * total_blocks   = ceil(videos.duration_seconds / 10.0)
--   * completo si cardinality(watched_blocks) >= ceil(total_blocks * pct / 100.0)
-- Re-ver no suma, la velocidad no importa y un seek no marca bloques saltados.
-- Anti-trampa (en código, no en esquema): el backend acepta como máximo un
-- bloque nuevo cada ~5 s reales desde last_heartbeat_at.
CREATE TABLE lesson_progress (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  enrollment_id         bigint      NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_id             bigint      NOT NULL REFERENCES lessons(id),
  watched_blocks        integer[]   NOT NULL DEFAULT '{}'
                        CHECK (0 <= ALL (watched_blocks)),
  last_position_seconds integer     NOT NULL DEFAULT 0 CHECK (last_position_seconds >= 0),
  last_heartbeat_at     timestamptz,
  is_completed          boolean     NOT NULL DEFAULT false,
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, lesson_id),
  CONSTRAINT completed_has_date
    CHECK (NOT is_completed OR completed_at IS NOT NULL)
);
CREATE INDEX lesson_progress_lesson_idx ON lesson_progress (lesson_id);

-- -----------------------------------------------------------------------------
-- 6. AUDITORÍA
-- -----------------------------------------------------------------------------

-- Registrar al menos: aprobar/rechazar video, pago manual, emitir/revocar
-- certificado, reembolsos, inscripciones manuales, cambios de rol/is_active.
CREATE TABLE audit_logs (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id    bigint      REFERENCES users(id),
  action      text        NOT NULL,
  entity_type text        NOT NULL,
  entity_id   bigint,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_actor_idx   ON audit_logs (actor_id);
CREATE INDEX audit_logs_entity_idx  ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at);

-- -----------------------------------------------------------------------------
-- 7. TRIGGERS updated_at
-- -----------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'courses', 'course_docentes', 'modules', 'videos', 'lessons',
    'resources', 'orders', 'transactions', 'enrollments', 'lesson_progress'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t || '_set_updated_at', t);
  END LOOP;
END $$;

COMMIT;

-- =============================================================================
-- CONSULTAS DE REFERENCIA (para el código, no se ejecutan aquí)
-- =============================================================================

-- A) Marcar bloques vistos sin duplicados ($1 = progress id, $2 = int[] nuevos):
--   UPDATE lesson_progress
--      SET watched_blocks = ARRAY(
--            SELECT DISTINCT b FROM unnest(watched_blocks || $2::int[]) AS b ORDER BY b),
--          last_heartbeat_at = now()
--    WHERE id = $1;

-- B) ¿Lección completada? ($1 = progress id)
--   SELECT cardinality(lp.watched_blocks)
--            >= ceil(ceil(v.duration_seconds / 10.0) * c.min_watch_percentage / 100.0)
--     FROM lesson_progress lp
--     JOIN enrollments e ON e.id = lp.enrollment_id
--     JOIN courses c     ON c.id = e.course_id
--     JOIN lessons l     ON l.id = lp.lesson_id
--     JOIN videos v      ON v.id = l.video_id
--    WHERE lp.id = $1;

-- C) Lecciones pendientes de un módulo para un estudiante. Solo cuentan
--    lecciones publicadas y no borradas, así una lección archivada no lo bloquea:
--   SELECT count(*)
--     FROM lessons l
--     LEFT JOIN lesson_progress lp
--            ON lp.lesson_id = l.id AND lp.enrollment_id = $1
--    WHERE l.module_id = $2
--      AND l.status = 'published'
--      AND l.deleted_at IS NULL
--      AND COALESCE(lp.is_completed, false) = false;

-- D) Heartbeat de progreso, atómico y con límite de ritmo.
--    $1 = progress id, $2 = índice de bloque (int), $3 = posición actual (segundos)
--    Acepta el bloque solo si está dentro de la duración del video y han pasado
--    >= 5 s reales desde el último latido aceptado. Si no actualiza ninguna fila,
--    el latido se descarta. Cualquier bloque es válido (no se exige contigüidad):
--    un seek solo marca el bloque donde se reproduce, y el límite de ritmo
--    impide inyectar bloques en bucle.
--    Piso de tiempo: 5 s por bloque de 10 s equivale a reproducir a 2x, la
--    velocidad máxima del reproductor de YouTube. Por diseño, una lección no
--    puede acreditarse en menos de ~la mitad de la duración del video. Exigir
--    tiempo conectado >= duración real penalizaría a quien ve a 2x.
--   UPDATE lesson_progress lp
--      SET watched_blocks = ARRAY(
--            SELECT DISTINCT b
--              FROM unnest(lp.watched_blocks || ARRAY[$2::int]) AS b
--             ORDER BY b),
--          last_position_seconds = $3,
--          last_heartbeat_at = now()
--     FROM lessons l
--     JOIN videos v ON v.id = l.video_id
--    WHERE lp.id = $1
--      AND l.id = lp.lesson_id
--      AND $2::int BETWEEN 0 AND ceil(v.duration_seconds / 10.0)::int - 1
--      AND (lp.last_heartbeat_at IS NULL
--           OR lp.last_heartbeat_at <= now() - interval '5 seconds')
--   RETURNING lp.id;

-- E) Webhook de pago confirmado: crear o REACTIVAR la inscripción.
--    Hacerlo en la misma transacción que marca la orden como 'paid'.
--    Si la fila existente ya está activa/completada no se toca (idempotencia);
--    el INSERT no devuelve fila y la app lo trata como "ya procesado".
--    Si estaba cancelada y ya tenía completed_at, vuelve como 'completed'.
--   INSERT INTO enrollments (user_id, course_id, order_id, enrolled_by, status)
--   VALUES ($1, $2, $3, NULL, 'active')
--   ON CONFLICT (user_id, course_id) DO UPDATE
--     SET status      = CASE WHEN enrollments.completed_at IS NOT NULL
--                            THEN 'completed' ELSE 'active' END,
--         order_id    = EXCLUDED.order_id,
--         enrolled_by = NULL
--     WHERE enrollments.status = 'cancelled'
--   RETURNING id;

-- F) ¿La inscripción completó TODO el curso? ($1 = enrollment id)
--    Verdadero solo si (a) existe al menos una lección publicada y no borrada
--    en el curso, y (b) ninguna lección publicada y no borrada está sin completar.
--    El curso vacío NO se completa solo. Ejecutar solo si la inscripción está
--    'active'; una inscripción 'completed' se congela (no se reevalúa si el
--    docente agrega lecciones después).
--   SELECT
--     EXISTS (
--       SELECT 1
--         FROM enrollments e
--         JOIN modules m ON m.course_id = e.course_id AND m.deleted_at IS NULL
--         JOIN lessons l ON l.module_id = m.id
--                       AND l.status = 'published' AND l.deleted_at IS NULL
--        WHERE e.id = $1
--     )
--     AND NOT EXISTS (
--       SELECT 1
--         FROM enrollments e
--         JOIN modules m ON m.course_id = e.course_id AND m.deleted_at IS NULL
--         JOIN lessons l ON l.module_id = m.id
--                       AND l.status = 'published' AND l.deleted_at IS NULL
--         LEFT JOIN lesson_progress lp
--                ON lp.lesson_id = l.id AND lp.enrollment_id = e.id
--        WHERE e.id = $1
--          AND COALESCE(lp.is_completed, false) = false
--     ) AS course_completed;

-- =============================================================================
-- REGLAS QUE VIVEN EN LA APP (la base de datos NO las protege: escribir pruebas)
-- =============================================================================
-- Roles
--   [ ] course_docentes.user_id y videos.uploaded_by -> users.role = 'docente'
--   [ ] videos.reviewed_by, orders.confirmed_by, enrollments.enrolled_by
--       -> users.role IN ('admin', 'superadmin')
-- Contenido
--   [ ] lesson_progress.lesson_id debe pertenecer al curso de su inscripción
--   [ ] Publicar una lección exige videos.status = 'approved'
--   [ ] Al rechazar o borrar un video, archivar las lecciones publicadas que lo usan
--   [ ] "Módulo completado" ignora lecciones no publicadas o borradas (consulta C)
-- Progreso
--   [ ] El frontend envía el latido solo mientras el reproductor está en
--       "playing", con el bloque actual = floor(currentTime / 10); un seek no
--       marca nada hasta que el video realmente se reproduce ahí
--   [ ] Usar la consulta D (límite de ritmo atómico); NO exigir bloques contiguos
--   [ ] Tras cada latido aceptado, recalcular con la consulta B y, si cumple,
--       poner is_completed = true y completed_at = now()
--   [ ] Si la inscripción está 'active' y la consulta F da true, ponerla
--       'completed' con completed_at = now() (una inscripción completada se congela)
-- Pagos
--   [ ] Webhook idempotente (transactions_provider_ref_unique) con verificación de firma
--   [ ] Marcar la orden 'paid' y crear/reactivar la inscripción (consulta E) en una transacción
--   [ ] Usar siempre orders.amount, nunca courses.price, para una orden existente
-- Auditoría
--   [ ] Escribir en audit_logs: aprobar/rechazar video, pago manual, inscripción
--       manual, reembolso, emitir/revocar certificado, cambios de rol o is_active
-- Pendientes del cliente (afectan reglas, no el esquema actual)
--   [ ] Reembolso: ¿cancela la inscripción? ¿revoca el certificado?
--   [ ] Curso editado con estudiantes inscritos (propuesta: inscripción completada se congela)
--   [ ] Recompra tras reembolso: ¿se conserva el progreso? (por defecto, sí)
--   [ ] ¿Qué califica el docente? (define si grades entra al MVP)