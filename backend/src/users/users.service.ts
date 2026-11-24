import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq, count, and } from 'drizzle-orm';
import { Pool } from 'pg';
import { DRIZZLE_DB, DrizzleDb, PG_POOL } from '../database/database.provider';
import { users } from '../database/schema/users.schema';
import { enrollments } from '../database/schema/enrollments.schema';
import { certificates } from '../database/schema/certificates.schema';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  /* ------------------------------------------------------------------ */
  /*  GET /api/users/me                                                   */
  /* ------------------------------------------------------------------ */
  async getMe(userId: number) {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        phone: users.phone,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const [enrollmentStats] = await this.db
      .select({ total: count() })
      .from(enrollments)
      .where(eq(enrollments.userId, userId));

    const [completedCount] = await this.db
      .select({ total: count() })
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.status, 'completed')));

    const [certCount] = await this.db
      .select({ total: count() })
      .from(certificates)
      .where(eq(certificates.userId, userId));

    return {
      ...user,
      stats: {
        enrollments: enrollmentStats?.total ?? 0,
        completedCourses: completedCount?.total ?? 0,
        certificates: certCount?.total ?? 0,
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  PATCH /api/users/me/profile                                         */
  /* ------------------------------------------------------------------ */
  async updateProfile(
    userId: number,
    dto: { fullName?: string; bio?: string; phone?: string; avatarUrl?: string },
  ) {
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const updateData: Partial<typeof users.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName.trim();
    if (dto.bio !== undefined) updateData.bio = dto.bio;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;

    await this.db.update(users).set(updateData).where(eq(users.id, userId));

    return this.getMe(userId);
  }

  /* ------------------------------------------------------------------ */
  /*  PATCH /api/users/me/password                                        */
  /* ------------------------------------------------------------------ */
  async updatePassword(
    userId: number,
    dto: { currentPassword: string; newPassword: string; confirmPassword: string },
  ) {
    if (!dto.currentPassword || !dto.newPassword || !dto.confirmPassword) {
      throw new BadRequestException('Todos los campos son obligatorios');
    }
    if (dto.newPassword.length < 8) {
      throw new BadRequestException('La nueva contraseña debe tener al menos 8 caracteres');
    }
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const [user] = await this.db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');

    const newHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return { message: 'Contraseña actualizada correctamente' };
  }

  /* ------------------------------------------------------------------ */
  /*  GET /api/users/dashboard                                          */
  /* ------------------------------------------------------------------ */
  async getDashboardSummary(user: { id: number; fullName: string; role: string; email: string }) {
    const role = user.role;

    // --- PANEL ESTUDIANTE ---
    if (role === 'estudiante' || role === 'student') {
      const coursesRes = await this.pool.query(
        `SELECT
           e.id as "enrollmentId",
           e.status,
           e.enrolled_at as "enrolledAt",
           e.completed_at as "completedAt",
           c.id as "courseId",
           c.title as "courseTitle",
           c.slug as "courseSlug",
           c.thumbnail_url as "thumbnailUrl",
           COUNT(l.id)::int as "totalLessons",
           COUNT(CASE WHEN lp.is_completed = true THEN 1 END)::int as "completedLessons"
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         LEFT JOIN modules m ON m.course_id = c.id AND m.deleted_at IS NULL
         LEFT JOIN lessons l ON l.module_id = m.id AND l.status = 'published' AND l.deleted_at IS NULL
         LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.enrollment_id = e.id
         WHERE e.user_id = $1 AND e.status != 'cancelled'
         GROUP BY e.id, c.id
         ORDER BY e.enrolled_at DESC;`,
        [user.id],
      );

      const enrolledCourses = coursesRes.rows.map((r) => {
        const total = r.totalLessons || 0;
        const comp = r.completedLessons || 0;
        const pct = total > 0 ? Math.round((comp / total) * 100) : 0;
        return {
          ...r,
          progressPercentage: pct,
        };
      });

      // Curso para "Continuar donde lo dejé"
      const inProgressCourse =
        enrolledCourses.find((c) => c.progressPercentage < 100 && c.status === 'active') ||
        enrolledCourses[0] ||
        null;

      // Próximas actividades pendientes de entrega
      const activitiesRes = await this.pool.query(
        `SELECT
           ua.id as "activityId",
           ua.title as "activityTitle",
           ua.due_date as "dueDate",
           c.title as "courseTitle",
           c.slug as "courseSlug"
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         JOIN modules m ON m.course_id = c.id AND m.deleted_at IS NULL
         JOIN lessons l ON l.module_id = m.id AND l.status = 'published' AND l.deleted_at IS NULL
         JOIN unit_activities ua ON ua.lesson_id = l.id
         LEFT JOIN activity_submissions asub ON asub.activity_id = ua.id AND asub.user_id = $1
         WHERE e.user_id = $1 AND e.status = 'active' AND asub.id IS NULL
         ORDER BY ua.due_date ASC NULLS LAST, ua.created_at DESC
         LIMIT 5;`,
        [user.id],
      );

      return {
        role: 'estudiante',
        userName: user.fullName,
        resumeCourse: inProgressCourse,
        courses: enrolledCourses,
        pendingActivities: activitiesRes.rows,
      };
    }

    // --- PANEL DOCENTE ---
    if (role === 'docente' || role === 'teacher') {
      const statsRes = await this.pool.query(
        `SELECT
           COUNT(DISTINCT c.id)::int as "totalCourses",
           COUNT(DISTINCT CASE WHEN c.status = 'published' THEN c.id END)::int as "publishedCourses",
           COUNT(DISTINCT CASE WHEN c.status = 'draft' THEN c.id END)::int as "draftCourses",
           COUNT(DISTINCT e.user_id)::int as "totalStudents"
         FROM courses c
         LEFT JOIN course_docentes cd ON cd.course_id = c.id
         LEFT JOIN enrollments e ON e.course_id = c.id AND e.status != 'cancelled'
         WHERE c.created_by = $1 OR cd.user_id = $1;`,
        [user.id],
      );

      const pendingGradingRes = await this.pool.query(
        `SELECT
           asub.id as "submissionId",
           ua.id as "activityId",
           ua.title as "activityTitle",
           u.full_name as "studentName",
           c.id as "courseId",
           c.title as "courseTitle",
           c.slug as "courseSlug",
           asub.submitted_at as "submittedAt"
         FROM activity_submissions asub
         JOIN unit_activities ua ON ua.id = asub.activity_id
         JOIN lessons l ON l.id = ua.lesson_id
         JOIN modules m ON m.id = l.module_id
         JOIN courses c ON c.id = m.course_id
         JOIN users u ON u.id = asub.user_id
         LEFT JOIN course_docentes cd ON cd.course_id = c.id
         WHERE asub.status = 'submitted'
           AND (c.created_by = $1 OR cd.user_id = $1)
         ORDER BY asub.submitted_at ASC
         LIMIT 6;`,
        [user.id],
      );

      const teacherCoursesRes = await this.pool.query(
        `SELECT
           c.id,
           c.title,
           c.slug,
           c.status,
           c.thumbnail_url as "thumbnailUrl",
           c.price,
           c.currency,
           COUNT(DISTINCT e.user_id)::int as "studentsCount"
         FROM courses c
         LEFT JOIN course_docentes cd ON cd.course_id = c.id
         LEFT JOIN enrollments e ON e.course_id = c.id AND e.status != 'cancelled'
         WHERE c.created_by = $1 OR cd.user_id = $1
         GROUP BY c.id
         ORDER BY c.created_at DESC
         LIMIT 6;`,
        [user.id],
      );

      return {
        role: 'docente',
        userName: user.fullName,
        stats: statsRes.rows[0] || { totalCourses: 0, publishedCourses: 0, draftCourses: 0, totalStudents: 0 },
        pendingGrading: pendingGradingRes.rows,
        courses: teacherCoursesRes.rows,
      };
    }

    // --- PANEL ADMIN / SUPERADMIN ---
    const adminStatsRes = await this.pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM orders WHERE status = 'pending') as "pendingPaymentsCount",
         (SELECT COUNT(DISTINCT user_id)::int FROM enrollments WHERE status != 'cancelled') as "totalStudentsCount",
         COALESCE(
           (SELECT SUM(CAST(amount AS numeric))
            FROM orders
            WHERE status = 'paid'
              AND currency = 'BOB'
              AND confirmed_at >= date_trunc('month', CURRENT_DATE)),
           0
         )::float as "monthlyRevenueBob";`,
    );

    // Inscripciones por semana (últimas 6 semanas)
    const weeklyRes = await this.pool.query(
      `SELECT
         to_char(d, 'DD Mon') as "weekLabel",
         COUNT(e.id)::int as "count"
       FROM generate_series(
         date_trunc('week', CURRENT_DATE - interval '5 weeks'),
         date_trunc('week', CURRENT_DATE),
         interval '1 week'
       ) d
       LEFT JOIN enrollments e
         ON date_trunc('week', e.enrolled_at) = d AND e.status != 'cancelled'
       GROUP BY d
       ORDER BY d ASC;`,
    );

    // Cursos más vendidos
    const topCoursesRes = await this.pool.query(
      `SELECT
         c.id,
         c.title,
         c.slug,
         c.price,
         c.currency,
         c.thumbnail_url as "thumbnailUrl",
         COUNT(DISTINCT e.id)::int as "enrollmentsCount",
         COALESCE(SUM(CASE WHEN o.status = 'paid' THEN CAST(o.amount AS numeric) ELSE 0 END), 0)::float as "revenue"
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id AND e.status != 'cancelled'
       LEFT JOIN orders o ON o.course_id = c.id AND o.status = 'paid'
       WHERE c.status = 'published'
       GROUP BY c.id
       ORDER BY "enrollmentsCount" DESC, "revenue" DESC
       LIMIT 5;`,
    );

    return {
      role: 'admin',
      userName: user.fullName,
      stats: adminStatsRes.rows[0] || { pendingPaymentsCount: 0, totalStudentsCount: 0, monthlyRevenueBob: 0 },
      weeklyEnrollments: weeklyRes.rows,
      topCourses: topCoursesRes.rows,
    };
  }
}
