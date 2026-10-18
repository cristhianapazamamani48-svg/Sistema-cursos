import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDb } from '../database/database.provider';
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
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

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
      .where(eq(courses.slug, slug))
      .limit(1);

    if (!course) {
      throw new NotFoundException(`Curso con slug '${slug}' no encontrado`);
    }

    const courseModules = await this.db
      .select()
      .from(modules)
      .where(and(eq(modules.courseId, course.id), isNull(modules.deletedAt)))
      .orderBy(modules.orderIndex);

    // Obtener lecciones con videos para cada módulo
    const modulesWithLessons = await Promise.all(
      courseModules.map(async (mod) => {
        const modLessons = await this.db.query?.lessons?.findMany?.({
          where: and(eq(lessons.moduleId, mod.id), isNull(lessons.deletedAt)),
        }) || await this.getModuleLessons(mod.id);

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
        videoId: lessons.videoId,
        videoProviderRef: videos.providerRef,
        videoDurationSeconds: videos.durationSeconds,
      })
      .from(lessons)
      .leftJoin(videos, eq(lessons.videoId, videos.id))
      .where(and(eq(lessons.moduleId, moduleId), isNull(lessons.deletedAt)))
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
}
