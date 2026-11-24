import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL, DRIZZLE_DB, DrizzleDb } from '../database/database.provider';
import { User } from '../database/schema/users.schema';
import * as crypto from 'crypto';

@Injectable()
export class CertificatesService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
  ) {}

  /**
   * Generar o recuperar certificado de un curso completado
   */
  async issueCertificate(enrollmentId: number, user: User) {
    // 1. Obtener información de la inscripción, estudiante y curso
    const enrRes = await this.pool.query(
      `SELECT e.id as enrollment_id, e.user_id, e.course_id, e.status as enrollment_status, e.completed_at,
              u.full_name, u.email,
              c.title as course_title, c.slug as course_slug,
              COALESCE(
                (SELECT SUM(v.duration_seconds)
                 FROM lessons l
                 JOIN modules m ON m.id = l.module_id AND m.deleted_at IS NULL
                 JOIN videos v ON v.id = l.video_id
                 WHERE m.course_id = c.id AND l.deleted_at IS NULL AND l.status = 'published'),
                0
              )::int as total_seconds
       FROM enrollments e
       JOIN users u ON u.id = e.user_id
       JOIN courses c ON c.id = e.course_id
       WHERE e.id = $1;`,
      [enrollmentId],
    );

    if (enrRes.rowCount === 0) {
      throw new NotFoundException(`Inscripción #${enrollmentId} no encontrada`);
    }

    const enr = enrRes.rows[0];

    // Verificar permisos
    if (
      Number(enr.user_id) !== Number(user.id) &&
      user.role !== 'admin' &&
      user.role !== 'superadmin'
    ) {
      throw new ForbiddenException('No tienes permiso para emitir o ver este certificado');
    }

    // 2. Si ya existe un certificado para esta inscripción, retornarlo directamente
    const existingCert = await this.pool.query(
      `SELECT id, code, enrollment_id as "enrollmentId", user_id as "userId",
              course_id as "courseId", student_name as "studentName",
              course_title as "courseTitle", workload_hours as "workloadHours",
              issued_at as "issuedAt"
       FROM certificates
       WHERE enrollment_id = $1;`,
      [enrollmentId],
    );

    if (existingCert.rowCount && existingCert.rowCount > 0) {
      return {
        ...existingCert.rows[0],
        courseSlug: enr.course_slug,
      };
    }

    // 3. Verificar que el curso esté completado al 100%
    if (enr.enrollment_status !== 'completed') {
      const progressCheck = await this.pool.query(
        `SELECT COUNT(DISTINCT l.id)::int as total_lessons,
                COUNT(DISTINCT CASE WHEN lp.is_completed = true THEN lp.lesson_id END)::int as completed_lessons
         FROM lessons l
         JOIN modules m ON m.id = l.module_id AND m.deleted_at IS NULL
         LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.enrollment_id = $1
         WHERE m.course_id = $2 AND l.deleted_at IS NULL AND l.status = 'published';`,
        [enrollmentId, enr.course_id],
      );

      const totalLessons = Number(progressCheck.rows[0]?.total_lessons) || 0;
      const completedLessons = Number(progressCheck.rows[0]?.completed_lessons) || 0;

      if (totalLessons === 0 || completedLessons < totalLessons) {
        throw new BadRequestException(
          `Debes completar el 100% de las lecciones del curso para obtener tu certificado (${completedLessons}/${totalLessons} completadas)`,
        );
      }

      // Marcar inscripción como completed
      await this.pool.query(
        `UPDATE enrollments
            SET status = 'completed', completed_at = now()
          WHERE id = $1;`,
        [enrollmentId],
      );
    }

    // 4. Calcular carga horaria estimada (duración de clases + horas de práctica/estudio autónomo)
    const durationHours = Math.ceil((Number(enr.total_seconds) || 0) / 3600);
    const workloadHours = Math.max(20, Math.min(120, durationHours * 3 || 40));

    // 5. Generar código único de acreditación alfanumérico (ej. CERT-2026-A1B2-C3D4)
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const timeSuffix = Date.now().toString(36).slice(-4).toUpperCase();
    const code = `CERT-${new Date().getFullYear()}-${randomHex.slice(0, 4)}-${timeSuffix}`;

    const studentName = enr.full_name?.trim() || enr.email.split('@')[0];
    const courseTitle = enr.course_title;

    // 6. Insertar certificado oficial en base de datos
    const insertRes = await this.pool.query(
      `INSERT INTO certificates (code, enrollment_id, user_id, course_id, student_name, course_title, workload_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, code, enrollment_id as "enrollmentId", user_id as "userId",
                 course_id as "courseId", student_name as "studentName",
                 course_title as "courseTitle", workload_hours as "workloadHours",
                 issued_at as "issuedAt";`,
      [code, enrollmentId, enr.user_id, enr.course_id, studentName, courseTitle, workloadHours],
    );

    const certificate = insertRes.rows[0];

    // Registrar en auditoría
    await this.pool.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5);`,
      [
        user.id,
        'certificate.issued',
        'certificates',
        certificate.id,
        JSON.stringify({ code: certificate.code, enrollmentId, courseTitle }),
      ],
    ).catch(() => {});

    return {
      ...certificate,
      courseSlug: enr.course_slug,
    };
  }

  /**
   * Obtener certificado por ID de inscripción
   */
  async getCertificateByEnrollment(enrollmentId: number, user: User) {
    const res = await this.pool.query(
      `SELECT cert.id, cert.code, cert.enrollment_id as "enrollmentId", cert.user_id as "userId",
              cert.course_id as "courseId", cert.student_name as "studentName",
              cert.course_title as "courseTitle", cert.workload_hours as "workloadHours",
              cert.issued_at as "issuedAt", c.slug as "courseSlug"
       FROM certificates cert
       JOIN courses c ON c.id = cert.course_id
       WHERE cert.enrollment_id = $1;`,
      [enrollmentId],
    );

    if (res.rowCount === 0) {
      throw new NotFoundException('Certificado aún no emitido para esta inscripción');
    }

    const cert = res.rows[0];
    if (
      Number(cert.userId) !== Number(user.id) &&
      user.role !== 'admin' &&
      user.role !== 'superadmin' &&
      user.role !== 'docente'
    ) {
      throw new ForbiddenException('No tienes permiso para ver este certificado');
    }

    return cert;
  }

  /**
   * Listar todos los certificados del estudiante autenticado
   */
  async getMyCertificates(userId: number) {
    const res = await this.pool.query(
      `SELECT cert.id, cert.code, cert.enrollment_id as "enrollmentId", cert.user_id as "userId",
              cert.course_id as "courseId", cert.student_name as "studentName",
              cert.course_title as "courseTitle", cert.workload_hours as "workloadHours",
              cert.issued_at as "issuedAt", c.slug as "courseSlug", c.thumbnail_url as "thumbnailUrl"
       FROM certificates cert
       JOIN courses c ON c.id = cert.course_id
       WHERE cert.user_id = $1
       ORDER BY cert.issued_at DESC;`,
      [userId],
    );

    return res.rows;
  }

  /**
   * Verificación pública de autenticidad por código de certificado
   */
  async verifyCertificate(code: string) {
    if (!code || typeof code !== 'string') {
      return { valid: false, message: 'Código de certificado inválido' };
    }

    const sanitizedCode = code.trim().toUpperCase();

    const res = await this.pool.query(
      `SELECT cert.code, cert.student_name as "studentName", cert.course_title as "courseTitle",
              cert.workload_hours as "workloadHours", cert.issued_at as "issuedAt",
              c.slug as "courseSlug"
       FROM certificates cert
       JOIN courses c ON c.id = cert.course_id
       WHERE UPPER(cert.code) = $1;`,
      [sanitizedCode],
    );

    if (res.rowCount === 0) {
      return {
        valid: false,
        message: 'Certificado no encontrado en el Registro Oficial de Acreditación Digital.',
      };
    }

    return {
      valid: true,
      certificate: res.rows[0],
    };
  }
}
