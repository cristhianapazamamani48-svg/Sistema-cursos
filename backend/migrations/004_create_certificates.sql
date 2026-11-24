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
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);
