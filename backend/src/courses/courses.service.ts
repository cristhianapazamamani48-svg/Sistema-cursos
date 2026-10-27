import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { DRIZZLE_DB, PG_POOL, DrizzleDb } from '../database/database.provider';
import {
  courses,
  courseDocentes,
  modules,
  Course,
  Module as CourseModule,
} from '../database/schema/courses.schema';
import { users } from '../database/schema/users.schema';
import { lessons } from '../database/schema/lessons.schema';
import { videos } from '../database/schema/videos.schema';
import {
  CreateCourseDto,
  UpdateCourseDto,
  AssignDocenteDto,
  CreateModuleDto,
} from './dto/course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
  ) {}

  /**
   * Listar cursos públicos o todos (según rol)
   */
  async findAll(publishedOnly = true) {
    if (publishedOnly) {
      return this.db.select().from(courses).where(eq(courses.status, 'published'));
    }
    return this.db.select().from(courses);
  }

  /**
   * Obtener curso por Slug o ID con sus módulos activos
   */
  async findBySlug(slug: string) {
    const [course] = await this.db
      .select()
      .from(courses)
      .where(and(eq(courses.slug, slug), eq(courses.status, 'published')))
      .limit(1);

    if (!course) {
      throw new NotFoundException(`Curso con slug '${slug}' no encontrado o no disponible`);
    }

    const courseModules = await this.db
      .select()
      .from(modules)
      .where(and(eq(modules.courseId, course.id), isNull(modules.deletedAt)))
      .orderBy(modules.orderIndex);

    // Obtener lecciones públicas sin providerRef
    const modulesWithLessons = await Promise.all(
      courseModules.map(async (mod) => {
        const modLessons = await this.getModuleLessons(mod.id);
        return {
          ...mod,
          lessons: modLessons,
        };
      })
    );

    return {
      ...course,
      modules: modulesWithLessons,
    };
  }

  private async getModuleLessons(moduleId: number) {
    const rows = await this.db
      .select({
        id: lessons.id,
        title: lessons.title,
        orderIndex: lessons.orderIndex,
        status: lessons.status,
        videoDurationSeconds: videos.durationSeconds,
      })
      .from(lessons)
      .leftJoin(videos, eq(lessons.videoId, videos.id))
      .where(
        and(
          eq(lessons.moduleId, moduleId),
          eq(lessons.status, 'published'),
          isNull(lessons.deletedAt),
        ),
      )
      .orderBy(lessons.orderIndex);

    return rows;
  }

  /**
   * Crear un nuevo curso
   */
  async create(dto: CreateCourseDto, creatorId: number) {
    const existing = await this.db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.slug, dto.slug as string))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException(`El slug '${dto.slug}' ya está en uso`);
    }

    const [newCourse] = await this.db
      .insert(courses)
      .values({
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        thumbnailUrl: dto.thumbnailUrl,
        price: String(dto.price ?? 0),
        currency: dto.currency,
        status: dto.status,
        minWatchPercentage: dto.minWatchPercentage,
        createdBy: creatorId,
      })
      .returning();

    return newCourse;
  }

  /**
   * Actualizar curso
   */
  async update(id: number, dto: UpdateCourseDto) {
    const [existing] = await this.db.select().from(courses).where(eq(courses.id, id)).limit(1);
    if (!existing) {
      throw new NotFoundException(`Curso #${id} no encontrado`);
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.db
        .select({ id: courses.id })
        .from(courses)
        .where(eq(courses.slug, dto.slug as string))
        .limit(1);
      if (slugExists.length > 0) {
        throw new ConflictException(`El slug '${dto.slug}' ya está en uso`);
      }
    }

    const [updated] = await this.db
      .update(courses)
      .set({
        ...dto,
        price: dto.price !== undefined ? String(dto.price) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, id))
      .returning();

    return updated;
  }

  /**
   * Regla de negocio: course_docentes.user_id debe tener users.role = 'docente'
   */
  async assignDocente(courseId: number, dto: AssignDocenteDto) {
    const [user] = await this.db.select().from(users).where(eq(users.id, dto.userId)).limit(1);
    if (!user) {
      throw new NotFoundException('Docente no encontrado');
    }

    if (user.role !== 'docente') {
      throw new BadRequestException('El usuario asignado debe tener el rol de docente');
    }

    const [assignment] = await this.db
      .insert(courseDocentes)
      .values({
        courseId,
        userId: dto.userId,
      })
      .onConflictDoNothing()
      .returning();

    return assignment || { message: 'El docente ya estaba asignado a este curso' };
  }

  /**
   * Crear módulo para un curso
   */
  async createModule(courseId: number, dto: CreateModuleDto) {
    const [course] = await this.db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) {
      throw new NotFoundException(`Curso #${courseId} no encontrado`);
    }

    const [newModule] = await this.db
      .insert(modules)
      .values({
        courseId,
        title: dto.title,
        description: dto.description,
        orderIndex: dto.orderIndex,
      })
      .returning();

    return newModule;
  }

  /**
   * Listar cursos inscritos del estudiante con progreso global
   */
  async findMyEnrolledCourses(userId: number) {
    const userEnrollments = await this.pool.query(
      `SELECT e.id as enrollment_id, e.status as enrollment_status, e.created_at, e.completed_at,
              c.id as course_id, c.title as course_title, c.slug as course_slug,
              c.thumbnail_url, c.description, c.price, c.currency,
              count(DISTINCT l.id)::int as total_lessons,
              count(DISTINCT CASE WHEN lp.is_completed = true THEN lp.lesson_id END)::int as completed_lessons
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       LEFT JOIN modules m ON m.course_id = c.id AND m.deleted_at IS NULL
       LEFT JOIN lessons l ON l.module_id = m.id AND l.status = 'published' AND l.deleted_at IS NULL
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.enrollment_id = e.id
       WHERE e.user_id = $1 AND e.status != 'cancelled'
       GROUP BY e.id, c.id
       ORDER BY e.created_at DESC;`,
      [userId],
    );

    return userEnrollments.rows.map((row) => {
      const total = Number(row.total_lessons) || 0;
      const completed = Number(row.completed_lessons) || 0;
      const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        enrollmentId: Number(row.enrollment_id),
        status: row.enrollment_status,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        courseId: Number(row.course_id),
        title: row.course_title,
        slug: row.course_slug,
        thumbnailUrl: row.thumbnail_url,
        description: row.description,
        price: row.price,
        currency: row.currency,
        totalLessons: total,
        completedLessons: completed,
        progressPercentage,
      };
    });
  }

  /**
   * Obtener estructura del aula virtual (classroom) con candados secuenciales y progreso real
   */
  async getClassroom(slug: string, userId: number) {
    const [course] = await this.db
      .select()
      .from(courses)
      .where(eq(courses.slug, slug))
      .limit(1);

    if (!course) {
      throw new NotFoundException(`Curso con slug '${slug}' no encontrado`);
    }

    // Verificar inscripción activa o completada
    const enrollRes = await this.pool.query(
      `SELECT id, status, completed_at
       FROM enrollments
       WHERE user_id = $1 AND course_id = $2 AND status != 'cancelled'
       ORDER BY created_at DESC
       LIMIT 1;`,
      [userId, course.id],
    );

    if (enrollRes.rowCount === 0) {
      throw new ForbiddenException('No tienes una inscripción activa a este curso');
    }

    const enrollment = enrollRes.rows[0];

    // Obtener módulos del curso
    const courseModules = await this.db
      .select()
      .from(modules)
      .where(and(eq(modules.courseId, course.id), isNull(modules.deletedAt)))
      .orderBy(modules.orderIndex);

    let totalPublishedLessons = 0;
    let completedLessonsCount = 0;
    let previousModulesBlocked = false;

    const classroomModules = [];

    for (let i = 0; i < courseModules.length; i++) {
      const mod = courseModules[i];

      // Determinar si este módulo está bloqueado
      const isLocked = previousModulesBlocked;

      // Obtener lecciones publicadas del módulo
      const lessonsRes = await this.pool.query(
        `SELECT l.id, l.title, l.order_index, l.status, l.video_id,
                v.provider_ref, v.duration_seconds,
                lp.id as progress_id, lp.is_completed, lp.last_position_seconds,
                cardinality(lp.watched_blocks) as watched_blocks_count,
                ceil(v.duration_seconds / 10.0)::int as total_blocks
         FROM lessons l
         LEFT JOIN videos v ON v.id = l.video_id
         LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.enrollment_id = $1
         WHERE l.module_id = $2 AND l.status = 'published' AND l.deleted_at IS NULL
         ORDER BY l.order_index ASC;`,
        [enrollment.id, mod.id],
      );

      let moduleHasPendingLesson = false;

      const moduleLessons = lessonsRes.rows.map((row) => {
        totalPublishedLessons++;
        const isLessonCompleted = Boolean(row.is_completed);
        if (isLessonCompleted) {
          completedLessonsCount++;
        } else {
          moduleHasPendingLesson = true;
        }

        const totalBlocks = Number(row.total_blocks) || 0;
        const watchedCount = Number(row.watched_blocks_count) || 0;
        const currentWatchPercentage =
          totalBlocks > 0 ? Math.min(100, Math.round((watchedCount / totalBlocks) * 100)) : 0;

        return {
          id: Number(row.id),
          title: row.title,
          orderIndex: row.order_index,
          isLocked,
          isCompleted: isLessonCompleted,
          progressId: row.progress_id ? Number(row.progress_id) : null,
          currentWatchPercentage,
          lastPositionSeconds: row.last_position_seconds || 0,
          video: row.video_id
            ? {
                id: Number(row.video_id),
                providerRef: row.provider_ref,
                durationSeconds: row.duration_seconds,
              }
            : null,
        };
      });

      // Si este módulo tiene lecciones pendientes, los siguientes módulos estarán bloqueados
      if (moduleHasPendingLesson) {
        previousModulesBlocked = true;
      }

      classroomModules.push({
        id: Number(mod.id),
        title: mod.title,
        description: mod.description,
        orderIndex: mod.orderIndex,
        isLocked,
        lessons: moduleLessons,
      });
    }

    const overallPercentage =
      totalPublishedLessons > 0
        ? Math.min(100, Math.round((completedLessonsCount / totalPublishedLessons) * 100))
        : 0;

    return {
      course: {
        id: Number(course.id),
        title: course.title,
        slug: course.slug,
        description: course.description,
        minWatchPercentage: course.minWatchPercentage,
      },
      enrollment: {
        id: Number(enrollment.id),
        status: enrollment.status,
        completedAt: enrollment.completed_at,
      },
      overallProgress: {
        totalLessons: totalPublishedLessons,
        completedLessons: completedLessonsCount,
        percentage: overallPercentage,
      },
      modules: classroomModules,
    };
  }
}
