import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { PG_POOL } from '../database/database.provider';
import { CreateAdminUserDto } from './dto/admin-user.dto';

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
          WHERE e.status IN ('active', 'completed')
        ) AS "enrolledStudentsCount",
        (
          SELECT COUNT(*)::int
          FROM users
        ) AS "totalUsersCount",
        COALESCE(
          (
            SELECT SUM(CAST(o.amount AS numeric))
            FROM orders o
            WHERE o.status = 'paid'
              AND o.currency = 'BOB'
              AND o.confirmed_at >= date_trunc('month', CURRENT_DATE)
              AND o.confirmed_at < date_trunc('month', CURRENT_DATE) + interval '1 month'
          ),
          0
        )::float AS "monthlyRevenueBob";
    `;

    const result = await this.pool.query(sql);
    const row = result.rows[0];

    return {
      pendingPaymentsCount: Number(row.pendingPaymentsCount) || 0,
      pendingVideosCount: Number(row.pendingVideosCount) || 0,
      enrolledStudentsCount: Number(row.enrolledStudentsCount) || 0,
      totalUsersCount: Number(row.totalUsersCount) || 0,
      monthlyRevenueBob: Number(row.monthlyRevenueBob) || 0,
    };
  }

  /**
   * Listar estudiantes inscritos para auditoría del panel administrativo
   */
  async getEnrolledStudents() {
    const sql = `
      SELECT
        e.id,
        e.user_id as "userId",
        u.full_name as "fullName",
        u.email,
        e.course_id as "courseId",
        c.title as "courseTitle",
        e.status,
        e.created_at as "enrolledAt",
        e.completed_at as "completedAt"
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      JOIN courses c ON c.id = e.course_id
      WHERE e.status IN ('active', 'completed')
      ORDER BY e.created_at DESC
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

  /**
   * Crear nuevo usuario (docente, admin, etc.) desde el panel
   */
  async createUser(dto: CreateAdminUserDto, actorId: number) {
    const existing = await this.pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1;', [dto.email]);
    if (existing.rowCount && existing.rowCount > 0) {
      throw new ConflictException('El correo ya se encuentra registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const result = await this.pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, email_verified_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, now(), now(), now())
       RETURNING id, email, full_name as "fullName", role, is_active as "isActive", created_at as "createdAt";`,
      [dto.email, passwordHash, dto.fullName, dto.role],
    );

    const newUser = result.rows[0];

    await this.pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, now());`,
      [actorId, 'user.created', 'users', newUser.id, JSON.stringify({ role: dto.role, email: dto.email })],
    );

    return {
      id: Number(newUser.id),
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      isActive: Boolean(newUser.isActive),
      createdAt: newUser.createdAt,
    };
  }

  /**
   * Cambiar rol de un usuario
   */
  async updateUserRole(userId: number, role: string, actorId: number) {
    const userRes = await this.pool.query('SELECT id, role FROM users WHERE id = $1;', [userId]);
    if (userRes.rowCount === 0) {
      throw new NotFoundException(`Usuario #${userId} no encontrado`);
    }

    await this.pool.query('UPDATE users SET role = $1, updated_at = now() WHERE id = $2;', [role, userId]);

    await this.pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, now());`,
      [actorId, 'user.role_updated', 'users', userId, JSON.stringify({ previousRole: userRes.rows[0].role, newRole: role })],
    );

    return { success: true, userId, role };
  }

  /**
   * Activar o desactivar cuenta de usuario
   */
  async toggleUserStatus(userId: number, isActive: boolean, actorId: number) {
    const userRes = await this.pool.query('SELECT id FROM users WHERE id = $1;', [userId]);
    if (userRes.rowCount === 0) {
      throw new NotFoundException(`Usuario #${userId} no encontrado`);
    }

    await this.pool.query('UPDATE users SET is_active = $1, updated_at = now() WHERE id = $2;', [isActive, userId]);

    // Si se desactiva, invalidar todas sus sesiones activas de inmediato
    if (!isActive) {
      await this.pool.query('DELETE FROM sessions WHERE user_id = $1;', [userId]);
    }

    await this.pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, now());`,
      [actorId, 'user.status_updated', 'users', userId, JSON.stringify({ isActive })],
    );

    return { success: true, userId, isActive };
  }
}
