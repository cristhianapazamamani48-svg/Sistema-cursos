import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { eq, and, isNull } from 'drizzle-orm';
import { DRIZZLE_DB, PG_POOL, DrizzleDb } from '../database/database.provider';
import { lessons, resources } from '../database/schema/lessons.schema';
import { videos } from '../database/schema/videos.schema';
import { modules } from '../database/schema/courses.schema';
import { enrollments } from '../database/schema/enrollments.schema';
import { auditLogs } from '../database/schema/audit-logs.schema';
import { User } from '../database/schema/users.schema';
import {
  CreateLessonDto,
  UpdateLessonDto,
  CreateVideoDto,
  ReviewVideoDto,
  CreateResourceDto,
} from './dto/lesson.dto';

@Injectable()
export class LessonsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
  ) {}

  /**
   * Helper: verifica que el usuario tenga permiso para editar el curso del módulo.
   * Admins y superadmins siempre pasan.
   * Docentes deben ser creadores del curso o estar en course_docentes.
   */
  private async assertModuleCourseOwner(moduleId: number, user: User): Promise<number> {
    if (user.role === 'admin' || user.role === 'superadmin') {
      const [mod] = await this.db
        .select({ id: modules.id, courseId: modules.courseId })
        .from(modules)
        .where(eq(modules.id, moduleId))
        .limit(1);
      if (!mod) {
        throw new NotFoundException(`Módulo #${moduleId} no encontrado`);
      }
      return mod.courseId;
    }

    const query = `
      SELECT m.id, m.course_id as "courseId", c.created_by as "createdBy"
      FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = $1
      LIMIT 1;
    `;
    const res = await this.pool.query(query, [moduleId]);
    if (res.rowCount === 0) {
      throw new NotFoundException(`Módulo #${moduleId} no encontrado`);
    }

    const row = res.rows[0];
    const courseId = Number(row.courseId);
    const createdBy = Number(row.createdBy);

    if (createdBy === user.id) {
      return courseId;
    }

    const assignedRes = await this.pool.query(
      `SELECT id FROM course_docentes WHERE course_id = $1 AND user_id = $2 LIMIT 1;`,
      [courseId, user.id],
    );

    if (assignedRes.rowCount === 0) {
      throw new ForbiddenException('No tienes permiso para modificar contenidos de este curso');
    }

    return courseId;
  }

  /**
   * Helper: verifica que el usuario tenga permiso para editar el curso de la lección.
   */
  private async assertLessonCourseOwner(lessonId: number, user: User): Promise<{ courseId: number; moduleId: number }> {
    if (user.role === 'admin' || user.role === 'superadmin') {
      const [lesson] = await this.db
        .select({ id: lessons.id, moduleId: lessons.moduleId })
        .from(lessons)
        .where(eq(lessons.id, lessonId))
        .limit(1);
      if (!lesson) {
        throw new NotFoundException(`Lección #${lessonId} no encontrada`);
      }
      return { courseId: 0, moduleId: lesson.moduleId };
    }

    const query = `
      SELECT l.id, l.module_id as "moduleId", m.course_id as "courseId", c.created_by as "createdBy"
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE l.id = $1
      LIMIT 1;
    `;
    const res = await this.pool.query(query, [lessonId]);
    if (res.rowCount === 0) {
      throw new NotFoundException(`Lección #${lessonId} no encontrada`);
    }

    const row = res.rows[0];
    const courseId = Number(row.courseId);
    const moduleId = Number(row.moduleId);
    const createdBy = Number(row.createdBy);

    if (createdBy === user.id) {
      return { courseId, moduleId };
    }

    const assignedRes = await this.pool.query(
      `SELECT id FROM course_docentes WHERE course_id = $1 AND user_id = $2 LIMIT 1;`,
      [courseId, user.id],
    );

    if (assignedRes.rowCount === 0) {
      throw new ForbiddenException('No tienes permiso para modificar contenidos de este curso');
    }

    return { courseId, moduleId };
  }

  /**
   * Registro de un video por un docente (inicia en status 'pending')
   */
  async createVideo(dto: CreateVideoDto, uploaderId: number) {
    const [video] = await this.db
      .insert(videos)
      .values({
        title: dto.title,
        provider: dto.provider,
        providerRef: dto.providerRef,
        durationSeconds: null, // El docente no fija la duración; se define al aprobar
        uploadedBy: uploaderId,
        status: 'pending',
      })
      .returning();

    return video;
  }

  /**
   * Listar todos los videos (para administradores y docentes)
   */
  async findAllVideos() {
    return this.db.select().from(videos).where(isNull(videos.deletedAt));
  }

  /**
   * Revisión de un video por un admin/superadmin (approve o reject)
   * Regla de negocio: Si se rechaza un video, archivar lecciones que lo usen
   */
  async reviewVideo(videoId: number, dto: ReviewVideoDto, reviewerId: number) {
    const [video] = await this.db.select().from(videos).where(eq(videos.id, videoId)).limit(1);
    if (!video) {
      throw new NotFoundException(`Video #${videoId} no encontrado`);
    }

    const now = new Date();
    const [updatedVideo] = await this.db
      .update(videos)
      .set({
        status: dto.status,
        durationSeconds: dto.status === 'approved' && dto.durationSeconds ? dto.durationSeconds : video.durationSeconds,
        rejectionReason: dto.status === 'rejected' ? dto.rejectionReason : null,
        reviewedBy: reviewerId,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(videos.id, videoId))
      .returning();

    // Auditoría
    await this.db.insert(auditLogs).values({
      actorId: reviewerId,
      action: dto.status === 'approved' ? 'video.approved' : 'video.rejected',
      entityType: 'videos',
      entityId: videoId,
      metadata: { reason: dto.rejectionReason, durationSeconds: dto.durationSeconds },
    });

    // Si se rechaza, archivar únicamente las lecciones publicadas que lo usaban
    if (dto.status === 'rejected') {
      await this.db
        .update(lessons)
        .set({ status: 'archived', updatedAt: now })
        .where(and(eq(lessons.videoId, videoId), eq(lessons.status, 'published')));
    }

    return updatedVideo;
  }

  /**
   * Crear una lección
   * Regla de negocio: si status = 'published', exige video_id y que el video esté 'approved'
   */
  async createLesson(dto: CreateLessonDto, user: User) {
    await this.assertModuleCourseOwner(dto.moduleId, user);

    if (dto.status === 'published') {
      if (!dto.videoId) {
        throw new BadRequestException('Una lección publicada requiere un video asociado');
      }
      const [video] = await this.db.select().from(videos).where(eq(videos.id, dto.videoId)).limit(1);
      if (!video || video.status !== 'approved') {
        throw new BadRequestException('Para publicar una lección el video debe estar aprobado');
      }
    }

    const [lesson] = await this.db
      .insert(lessons)
      .values({
        moduleId: dto.moduleId,
        videoId: dto.videoId,
        title: dto.title,
        description: dto.description,
        orderIndex: dto.orderIndex,
        status: dto.status,
      })
      .returning();

    return lesson;
  }

  /**
   * Actualizar una lección
   * Regla de negocio: validar video approved al publicar
   */
  async updateLesson(lessonId: number, dto: UpdateLessonDto, user: User) {
    await this.assertLessonCourseOwner(lessonId, user);
    if (dto.moduleId !== undefined) {
      await this.assertModuleCourseOwner(dto.moduleId, user);
    }

    const [lesson] = await this.db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!lesson) {
      throw new NotFoundException(`Lección #${lessonId} no encontrada`);
    }

    const targetStatus = dto.status ?? lesson.status;
    const targetVideoId = dto.videoId !== undefined ? dto.videoId : lesson.videoId;

    if (targetStatus === 'published') {
      if (!targetVideoId) {
        throw new BadRequestException('Una lección publicada requiere un video asociado');
      }
      const [video] = await this.db.select().from(videos).where(eq(videos.id, targetVideoId)).limit(1);
      if (!video || video.status !== 'approved') {
        throw new BadRequestException('Para publicar una lección el video debe estar aprobado');
      }
    }

    const [updated] = await this.db
      .update(lessons)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(lessons.id, lessonId))
      .returning();

    return updated;
  }

  /**
   * Eliminar suavemente una lección
   */
  async deleteLesson(lessonId: number, user: User) {
    await this.assertLessonCourseOwner(lessonId, user);

    const [lesson] = await this.db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!lesson) {
      throw new NotFoundException(`Lección #${lessonId} no encontrada`);
    }

    const [deleted] = await this.db
      .update(lessons)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(lessons.id, lessonId))
      .returning();

    return deleted;
  }

  /**
   * Reordenar lecciones de un módulo
   */
  async reorderLessons(moduleId: number, lessonIds: number[], user: User) {
    await this.assertModuleCourseOwner(moduleId, user);

    for (let i = 0; i < lessonIds.length; i++) {
      await this.db
        .update(lessons)
        .set({
          orderIndex: i + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(lessons.id, lessonIds[i]), eq(lessons.moduleId, moduleId)));
    }
    return { success: true, count: lessonIds.length };
  }

  /**
   * Obtener lección con su video y recursos
   * Regla de seguridad: verificar inscripción activa/completada o rol de staff, y lección published
   */
  async getLesson(lessonId: number, user?: User) {
    const [lesson] = await this.db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!lesson || lesson.deletedAt) {
      throw new NotFoundException(`Lección #${lessonId} no encontrada`);
    }

    const isStaff = user && ['admin', 'superadmin', 'docente'].includes(user.role);

    if (!isStaff) {
      if (lesson.status !== 'published') {
        throw new ForbiddenException('La lección no está disponible o no ha sido publicada');
      }

      if (user) {
        const [enrollment] = await this.db
          .select({ id: enrollments.id, status: enrollments.status })
          .from(enrollments)
          .innerJoin(modules, eq(modules.courseId, enrollments.courseId))
          .innerJoin(lessons, eq(lessons.moduleId, modules.id))
          .where(
            and(
              eq(lessons.id, lessonId),
              eq(enrollments.userId, user.id),
              isNull(modules.deletedAt),
            ),
          )
          .limit(1);

        if (!enrollment || enrollment.status === 'cancelled') {
          throw new ForbiddenException('No tienes una inscripción activa al curso de esta lección');
        }
      } else {
        throw new ForbiddenException('Se requiere autenticación para acceder a esta lección');
      }
    }

    let video = null;
    if (lesson.videoId) {
      const [v] = await this.db.select().from(videos).where(eq(videos.id, lesson.videoId)).limit(1);
      video = v;
    }

    const lessonResources = await this.db
      .select()
      .from(resources)
      .where(and(eq(resources.lessonId, lessonId), isNull(resources.deletedAt)))
      .orderBy(resources.orderIndex);

    return {
      ...lesson,
      video,
      resources: lessonResources,
    };
  }

  /**
   * Agregar recurso a una lección
   */
  async addResource(lessonId: number, dto: CreateResourceDto, user: User) {
    await this.assertLessonCourseOwner(lessonId, user);

    const [lesson] = await this.db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!lesson) {
      throw new NotFoundException(`Lección #${lessonId} no encontrada`);
    }

    const [resource] = await this.db
      .insert(resources)
      .values({
        lessonId,
        title: dto.title,
        type: dto.type,
        url: dto.url,
        orderIndex: dto.orderIndex,
      })
      .returning();

    return resource;
  }
}
