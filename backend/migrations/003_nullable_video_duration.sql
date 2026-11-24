-- =============================================================================
-- Migración 003: Hacer duration_seconds nullable en videos
-- Permite registrar videos en estado 'pending' sin duración inicial
-- Valida que si el status es 'approved', duration_seconds debe ser > 0
-- =============================================================================

ALTER TABLE videos ALTER COLUMN duration_seconds DROP NOT NULL;

ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_duration_seconds_check;
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_approved_duration_check;

ALTER TABLE videos ADD CONSTRAINT videos_approved_duration_check
  CHECK (status <> 'approved' OR duration_seconds > 0);
