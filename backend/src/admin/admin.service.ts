import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.provider';

@Injectable()
export class AdminService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Resumen agregado del panel administrativo
   * Ejecuta una consulta agregada optimizada que consolida:
   * 1. Pagos pendientes (órdenes en status 'pending')
   * 2. Videos por aprobar (videos en status 'pending' activos)
   * 3. Estudiantes inscritos (usuarios únicos con inscripciones activas/completadas)
   * 4. Ingresos del mes en BOB (suma de órdenes pagadas en el mes actual en moneda BOB)
   */
  async getSummary() {
    const sql = `
      SELECT
        (
          SELECT COUNT(*)::int
          FROM orders o
          WHERE o.status = 'pending'
        ) AS "pendingPaymentsCount",
        (
          SELECT COUNT(*)::int
          FROM videos v
          WHERE v.status = 'pending' AND v.deleted_at IS NULL
        ) AS "pendingVideosCount",
        (
          SELECT COUNT(DISTINCT e.user_id)::int
          FROM enrollments e
          WHERE e.status != 'cancelled'
        ) AS "enrolledStudentsCount",
        (
          SELECT COALESCE(SUM(CAST(o.amount AS numeric)), 0)::numeric(12, 2)
          FROM orders o
          WHERE o.status = 'paid'
            AND o.currency = 'BOB'
            AND o.created_at >= date_trunc('month', CURRENT_TIMESTAMP)
        ) AS "monthlyRevenueBob";
    `;

    const result = await this.pool.query(sql);
    const row = result.rows[0] || {};

    return {
      pendingPaymentsCount: Number(row.pendingPaymentsCount) || 0,
      pendingVideosCount: Number(row.pendingVideosCount) || 0,
      enrolledStudentsCount: Number(row.enrolledStudentsCount) || 0,
      monthlyRevenueBob: Number(row.monthlyRevenueBob) || 0,
    };
  }

  /**
   * Listar estudiantes inscritos con datos del curso y fecha
   */
  async getEnrolledStudents() {
    const sql = `
      SELECT
        e.id,
        e.user_id as "userId",
        u.full_name as "fullName",
        u.email,
        c.id as "courseId",
        c.title as "courseTitle",
        e.status,
        e.enrolled_at as "enrolledAt",
        e.completed_at as "completedAt"
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      JOIN courses c ON c.id = e.course_id
      WHERE e.status != 'cancelled'
      ORDER BY e.enrolled_at DESC
      LIMIT 100;
    `;

    const result = await this.pool.query(sql);
    return result.rows.map((row) => ({
      id: Number(row.id),
      userId: Number(row.userId),
      fullName: row.fullName,
      email: row.email,
      courseId: Number(row.courseId),
      courseTitle: row.courseTitle,
      status: row.status,
      enrolledAt: row.enrolledAt,
      completedAt: row.completedAt,
    }));
  }

  /**
   * Listar todos los usuarios del sistema para el panel de administración
   */
  async getAllUsers() {
    const sql = `
      SELECT
        id,
        email,
        full_name as "fullName",
        role,
        is_active as "isActive",
        created_at as "createdAt"
      FROM users
      ORDER BY id ASC
      LIMIT 200;
    `;

    const result = await this.pool.query(sql);
    return result.rows.map((row) => ({
      id: Number(row.id),
      email: row.email,
      fullName: row.fullName,
      role: row.role,
      isActive: Boolean(row.isActive),
      createdAt: row.createdAt,
    }));
  }
}

