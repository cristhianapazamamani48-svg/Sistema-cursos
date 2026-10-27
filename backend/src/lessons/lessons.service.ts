import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDb } from '../database/database.provider';
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
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

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
        durationSeconds: dto.durationSeconds,
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
      metadata: { reason: dto.rejectionReason },
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
  async createLesson(dto: CreateLessonDto) {
    const [mod] = await this.db.select().from(modules).where(eq(modules.id, dto.moduleId)).limit(1);
    if (!mod) {
      throw new NotFoundException(`Módulo #${dto.moduleId} no encontrado`);
    }

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
  async updateLesson(lessonId: number, dto: UpdateLessonDto) {
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
  async addResource(lessonId: number, dto: CreateResourceDto) {
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
