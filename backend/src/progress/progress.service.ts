import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL, DRIZZLE_DB, DrizzleDb } from '../database/database.provider';
import { lessonProgress, enrollments } from '../database/schema';
import { eq, and } from 'drizzle-orm';
import { HeartbeatDto } from './dto/progress.dto';

@Injectable()
export class ProgressService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
  ) {}

  /**
   * Obtiene o inicializa la fila de progreso para un estudiante y lección
   */
  async getOrCreateProgress(userId: number, lessonId: number) {
    // 1. Verificar si existe inscripción activa o completada para el curso de esta lección
    const query = `
      SELECT e.id as enrollment_id, e.status as enrollment_status,
             l.id as lesson_id, l.status as lesson_status, l.module_id,
             m.order_index as module_order, m.course_id
      FROM lessons l
      JOIN modules m ON m.id = l.module_id AND m.deleted_at IS NULL
      JOIN courses c ON c.id = m.course_id
      JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1
      WHERE l.id = $2 AND l.deleted_at IS NULL;
    `;
    const res = await this.pool.query(query, [userId, lessonId]);
    if (res.rowCount === 0) {
      throw new ForbiddenException('El usuario no tiene una inscripción al curso de esta lección');
    }

    const { enrollment_id, enrollment_status, lesson_status, module_order, course_id } = res.rows[0];

    if (enrollment_status === 'cancelled') {
      throw new ForbiddenException('La inscripción a este curso está cancelada');
    }

    if (lesson_status !== 'published') {
      throw new ForbiddenException('La lección no está disponible o no ha sido publicada');
    }

    // Bloqueo secuencial: verificar si módulos anteriores tienen lecciones pendientes
    const prevModulesRes = await this.pool.query(
      `SELECT id FROM modules WHERE course_id = $1 AND deleted_at IS NULL AND order_index < $2 ORDER BY order_index ASC;`,
      [course_id, module_order],
    );
    for (const mod of prevModulesRes.rows) {
      const pending = await this.checkModulePendingLessons(Number(enrollment_id), Number(mod.id));
      if (pending > 0) {
        throw new ForbiddenException('Debes completar las lecciones de los módulos anteriores antes de acceder a esta lección');
      }
    }

    // 2. Buscar o crear la fila de progreso
    let [progress] = await this.db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.enrollmentId, enrollment_id),
          eq(lessonProgress.lessonId, lessonId),
        ),
      )
      .limit(1);

    if (!progress) {
      const [newProgress] = await this.db
        .insert(lessonProgress)
        .values({
          enrollmentId: enrollment_id,
          lessonId,
          watchedBlocks: [],
          lastPositionSeconds: 0,
        })
        .returning();
      progress = newProgress;
    }

    // 3. Enriquecer con totalBlocks y porcentaje real calculado
    const videoRes = await this.pool.query(
      `SELECT ceil(v.duration_seconds / 10.0)::int as total_blocks, c.min_watch_percentage
       FROM lessons l
       JOIN videos v ON v.id = l.video_id
       JOIN modules m ON m.id = l.module_id
       JOIN courses c ON c.id = m.course_id
       WHERE l.id = $1;`,
      [lessonId],
    );
    const totalBlocks = videoRes.rows[0]?.total_blocks || 0;
    const minWatchPercentage = videoRes.rows[0]?.min_watch_percentage || 85;
    const watchedCount = (progress.watchedBlocks || []).length;
    const currentWatchPercentage =
      totalBlocks > 0 ? Math.min(100, Math.round((watchedCount / totalBlocks) * 100)) : 0;

    return {
      ...progress,
      totalBlocks,
      watchedBlocksCount: watchedCount,
      minWatchPercentage,
      currentWatchPercentage,
    };
  }

  /**
   * Procesa el Heartbeat recibido del reproductor (Consulta D, B y F)
   */
  async handleHeartbeat(dto: HeartbeatDto, userId: number) {
    // Verificar propiedad del progreso y estado
    const ownerRes = await this.pool.query(
      `SELECT e.user_id, e.id as enrollment_id, e.status as enrollment_status,
              l.id as lesson_id, l.status as lesson_status, l.module_id,
              m.order_index as module_order, m.course_id
       FROM lesson_progress lp
       JOIN enrollments e ON e.id = lp.enrollment_id
       JOIN lessons l ON l.id = lp.lesson_id
       JOIN modules m ON m.id = l.module_id AND m.deleted_at IS NULL
       WHERE lp.id = $1;`,
      [dto.progressId],
    );

    if (ownerRes.rowCount === 0) {
      throw new NotFoundException('Registro de progreso no encontrado');
    }

    const { user_id, enrollment_id, enrollment_status, lesson_status, module_order, course_id } = ownerRes.rows[0];
    if (Number(user_id) !== Number(userId)) {
      throw new ForbiddenException('No tienes permiso para actualizar este progreso');
    }

    if (enrollment_status === 'cancelled') {
      throw new ForbiddenException('La inscripción al curso está cancelada');
    }

    if (lesson_status !== 'published') {
      throw new ForbiddenException('La lección no está disponible o no ha sido publicada');
    }

    // Bloqueo secuencial en heartbeat
    const prevModulesRes = await this.pool.query(
      `SELECT id FROM modules WHERE course_id = $1 AND deleted_at IS NULL AND order_index < $2;`,
      [course_id, module_order],
    );
    for (const mod of prevModulesRes.rows) {
      const pending = await this.checkModulePendingLessons(Number(enrollment_id), Number(mod.id));
      if (pending > 0) {
        throw new ForbiddenException('Módulo anterior bloqueado con lecciones pendientes');
      }
    }

    // CONSULTA D: Heartbeat atómico con rate-limiting de 5 segundos y validación de rango de bloques
    const queryD = `
      UPDATE lesson_progress lp
         SET watched_blocks = ARRAY(
               SELECT DISTINCT b
                 FROM unnest(lp.watched_blocks || ARRAY[$2::int]) AS b
                ORDER BY b),
             last_position_seconds = $3,
             last_heartbeat_at = now()
        FROM lessons l
        JOIN videos v ON v.id = l.video_id
       WHERE lp.id = $1
         AND l.id = lp.lesson_id
         AND $2::int BETWEEN 0 AND ceil(v.duration_seconds / 10.0)::int - 1
         AND (lp.last_heartbeat_at IS NULL
              OR lp.last_heartbeat_at <= now() - interval '5 seconds')
      RETURNING lp.id;
    `;

    const resD = await this.pool.query(queryD, [
      dto.progressId,
      dto.blockIndex,
      dto.currentPositionSeconds,
    ]);

    const accepted = (resD.rowCount ?? 0) > 0;
    if (!accepted) {
      return {
        accepted: false,
        message: 'Latido ignorado (límite de ritmo de 5s o bloque fuera de rango)',
      };
    }

    // CONSULTA B: ¿Lección completada?
    const queryB = `
      SELECT cardinality(lp.watched_blocks) AS watched_count,
             ceil(v.duration_seconds / 10.0)::int AS total_blocks,
             c.min_watch_percentage,
             cardinality(lp.watched_blocks)
               >= ceil(ceil(v.duration_seconds / 10.0) * c.min_watch_percentage / 100.0) AS is_completed,
             lp.is_completed AS already_completed
        FROM lesson_progress lp
        JOIN enrollments e ON e.id = lp.enrollment_id
        JOIN courses c     ON c.id = e.course_id
        JOIN lessons l     ON l.id = lp.lesson_id
        JOIN videos v      ON v.id = l.video_id
       WHERE lp.id = $1;
    `;
    const resB = await this.pool.query(queryB, [dto.progressId]);
    let lessonCompletedNow = false;
    let watchedCount = 0;
    let totalBlocks = 0;
    let minWatchPercentage = 85;

    if (resB.rowCount && resB.rowCount > 0) {
      const row = resB.rows[0];
      watchedCount = row.watched_count;
      totalBlocks = row.total_blocks;
      minWatchPercentage = row.min_watch_percentage;

      if (row.is_completed && !row.already_completed) {
        await this.pool.query(
          `UPDATE lesson_progress
              SET is_completed = true, completed_at = now()
            WHERE id = $1;`,
          [dto.progressId],
        );
        lessonCompletedNow = true;
      }
    }

    // CONSULTA F: ¿Completó todo el curso? (solo evaluar si la inscripción está 'active')
    let courseCompletedNow = false;
    if (enrollment_status === 'active') {
      const queryF = `
        SELECT
          EXISTS (
            SELECT 1
              FROM enrollments e
              JOIN modules m ON m.course_id = e.course_id AND m.deleted_at IS NULL
              JOIN lessons l ON l.module_id = m.id
                            AND l.status = 'published' AND l.deleted_at IS NULL
             WHERE e.id = $1
          )
          AND NOT EXISTS (
            SELECT 1
              FROM enrollments e
              JOIN modules m ON m.course_id = e.course_id AND m.deleted_at IS NULL
              JOIN lessons l ON l.module_id = m.id
                            AND l.status = 'published' AND l.deleted_at IS NULL
               LEFT JOIN lesson_progress lp
                      ON lp.lesson_id = l.id AND lp.enrollment_id = e.id
             WHERE e.id = $1
               AND COALESCE(lp.is_completed, false) = false
          ) AS course_completed;
      `;
      const resF = await this.pool.query(queryF, [enrollment_id]);
      if (resF.rows[0]?.course_completed) {
        await this.pool.query(
          `UPDATE enrollments
              SET status = 'completed', completed_at = now()
            WHERE id = $1;`,
          [enrollment_id],
        );
        courseCompletedNow = true;
      }
    }

    const currentWatchPct = totalBlocks > 0 ? Math.min(100, Math.round((watchedCount / totalBlocks) * 100)) : 0;

    return {
      accepted: true,
      watchedBlocksCount: watchedCount,
      totalBlocks,
      currentWatchPercentage: currentWatchPct,
      minWatchPercentage,
      lessonCompleted: lessonCompletedNow,
      isCompleted: Boolean(resB.rows[0]?.is_completed || resB.rows[0]?.already_completed),
      courseCompleted: courseCompletedNow,
    };
  }

  /**
   * CONSULTA C: Verificar si un estudiante tiene lecciones pendientes en un módulo anterior
   * (Bloqueo secuencial: estudiante no accede al módulo N+1 sin completar el N)
   */
  async checkModulePendingLessons(enrollmentId: number, moduleId: number): Promise<number> {
    const queryC = `
      SELECT count(*)::int AS pending_count
        FROM lessons l
        LEFT JOIN lesson_progress lp
               ON lp.lesson_id = l.id AND lp.enrollment_id = $1
       WHERE l.module_id = $2
         AND l.status = 'published'
         AND l.deleted_at IS NULL
         AND COALESCE(lp.is_completed, false) = false;
    `;
    const res = await this.pool.query(queryC, [enrollmentId, moduleId]);
    return res.rows[0]?.pending_count ?? 0;
  }
}
