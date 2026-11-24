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
import { courses, modules, courseDocentes } from '../database/schema/courses.schema';
import { lessons, resources } from '../database/schema/lessons.schema';
import { eq, and, isNull } from 'drizzle-orm';

@Injectable()
export class UnitsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
  ) {}

  // =========================================================================
  // HELPERS DE PERMISOS
  // =========================================================================

  /**
   * Verifica si el usuario es dueño del curso (docente asignado, creador o admin)
   */
  async assertUnitTeacher(lessonId: number, user: User) {
    if (user.role === 'admin' || user.role === 'superadmin') return;

    const res = await this.pool.query(
      `SELECT c.id as course_id, c.created_by
       FROM lessons l
       JOIN modules m ON m.id = l.module_id AND m.deleted_at IS NULL
       JOIN courses c ON c.id = m.course_id
       WHERE l.id = $1 AND l.deleted_at IS NULL;`,
      [lessonId],
    );

    if (res.rowCount === 0) {
      throw new NotFoundException(`Unidad #${lessonId} no encontrada`);
    }

    const { course_id, created_by } = res.rows[0];
    if (Number(created_by) === Number(user.id)) return;

    const [assigned] = await this.db
      .select()
      .from(courseDocentes)
      .where(and(eq(courseDocentes.courseId, course_id), eq(courseDocentes.userId, user.id)))
      .limit(1);

    if (!assigned) {
      throw new ForbiddenException('No tienes permiso de docente sobre esta unidad');
    }
  }

  /**
   * Verifica si el usuario tiene acceso a la unidad (estudiante inscrito o docente/admin)
   */
  async assertUnitAccess(lessonId: number, user: User) {
    if (user.role === 'admin' || user.role === 'superadmin') return;

    // Verificar si es docente
    try {
      await this.assertUnitTeacher(lessonId, user);
      return;
    } catch {
      // Si no es docente, verificar inscripción activa/completada
      const enrRes = await this.pool.query(
        `SELECT e.id
         FROM lessons l
         JOIN modules m ON m.id = l.module_id AND m.deleted_at IS NULL
         JOIN courses c ON c.id = m.course_id
         JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1
         WHERE l.id = $2 AND l.deleted_at IS NULL AND e.status != 'cancelled';`,
        [user.id, lessonId],
      );

      if (enrRes.rowCount === 0) {
        throw new ForbiddenException('No tienes una inscripción activa para acceder a esta unidad');
      }
    }
  }

  // =========================================================================
  // 1. MATERIAL DE ESTUDIO Y COMPLEMENTARIO
  // =========================================================================

  async updateStudyMaterial(
    lessonId: number,
    dto: { studyMaterialUrl?: string; studyMaterialContent?: string },
    user: User,
  ) {
    await this.assertUnitTeacher(lessonId, user);

    const res = await this.pool.query(
      `UPDATE lessons
          SET study_material_url = COALESCE($2, study_material_url),
              study_material_content = COALESCE($3, study_material_content),
              updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, title, study_material_url as "studyMaterialUrl", study_material_content as "studyMaterialContent";`,
      [lessonId, dto.studyMaterialUrl, dto.studyMaterialContent],
    );

    if (res.rowCount === 0) {
      throw new NotFoundException(`Unidad #${lessonId} no encontrada`);
    }

    return res.rows[0];
  }

  async getUnitResources(lessonId: number, user: User) {
    await this.assertUnitAccess(lessonId, user);

    const res = await this.pool.query(
      `SELECT id, lesson_id as "lessonId", title, type, url,
              material_category as "materialCategory", order_index as "orderIndex", created_at as "createdAt"
       FROM resources
       WHERE lesson_id = $1 AND deleted_at IS NULL
       ORDER BY material_category ASC, order_index ASC, id ASC;`,
      [lessonId],
    );

    return res.rows;
  }

  async addUnitResource(
    lessonId: number,
    dto: { title: string; type: 'pdf' | 'link' | 'image' | 'other'; url: string; materialCategory?: 'study' | 'complementary' },
    user: User,
  ) {
    await this.assertUnitTeacher(lessonId, user);

    const category = dto.materialCategory || 'complementary';

    const res = await this.pool.query(
      `INSERT INTO resources (lesson_id, title, type, url, material_category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, lesson_id as "lessonId", title, type, url, material_category as "materialCategory", order_index as "orderIndex";`,
      [lessonId, dto.title, dto.type, dto.url, category],
    );

    return res.rows[0];
  }

  async deleteUnitResource(resourceId: number, user: User) {
    const res = await this.pool.query(
      `SELECT r.id, r.lesson_id FROM resources r WHERE r.id = $1 AND r.deleted_at IS NULL;`,
      [resourceId],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException(`Recurso #${resourceId} no encontrado`);
    }

    await this.assertUnitTeacher(Number(res.rows[0].lesson_id), user);

    await this.pool.query(
      `UPDATE resources SET deleted_at = now(), updated_at = now() WHERE id = $1;`,
      [resourceId],
    );

    return { success: true };
  }

  // =========================================================================
  // 2. FORO DE LA UNIDAD
  // =========================================================================

  async getUnitForum(lessonId: number, user: User) {
    await this.assertUnitAccess(lessonId, user);

    // Obtener o inicializar el foro de la unidad
    let forumRes = await this.pool.query(
      `SELECT id, lesson_id as "lessonId", title, description, is_closed as "isClosed", created_at as "createdAt"
       FROM unit_forums
       WHERE lesson_id = $1;`,
      [lessonId],
    );

    if (forumRes.rowCount === 0) {
      // Auto-crear foro con título de la lección
      const lessonRes = await this.pool.query(
        `SELECT title FROM lessons WHERE id = $1;`,
        [lessonId],
      );
      const defaultTitle = lessonRes.rows[0]?.title ? `Foro: ${lessonRes.rows[0].title}` : 'Foro de Discusión de la Unidad';

      forumRes = await this.pool.query(
        `INSERT INTO unit_forums (lesson_id, title, description)
         VALUES ($1, $2, 'Espacio oficial de debate, dudas y consultas de la unidad.')
         RETURNING id, lesson_id as "lessonId", title, description, is_closed as "isClosed", created_at as "createdAt";`,
        [lessonId, defaultTitle],
      );
    }

    const forum = forumRes.rows[0];

    // Obtener mensajes del foro con datos del autor
    const messagesRes = await this.pool.query(
      `SELECT fm.id, fm.forum_id as "forumId", fm.user_id as "userId", fm.parent_id as "parentId",
              fm.message, fm.created_at as "createdAt",
              u.full_name as "authorName", u.role as "authorRole", u.email as "authorEmail"
       FROM forum_messages fm
       JOIN users u ON u.id = fm.user_id
       WHERE fm.forum_id = $1
       ORDER BY fm.created_at ASC;`,
      [forum.id],
    );

    return {
      ...forum,
      messages: messagesRes.rows,
    };
  }

  async postForumMessage(
    lessonId: number,
    dto: { message: string; parentId?: number },
    user: User,
  ) {
    await this.assertUnitAccess(lessonId, user);

    const forumData = await this.getUnitForum(lessonId, user);
    if (forumData.isClosed) {
      throw new BadRequestException('El foro de esta unidad se encuentra cerrado para nuevas respuestas');
    }

    if (!dto.message || !dto.message.trim()) {
      throw new BadRequestException('El mensaje no puede estar vacío');
    }

    const insertRes = await this.pool.query(
      `INSERT INTO forum_messages (forum_id, user_id, parent_id, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, forum_id as "forumId", user_id as "userId", parent_id as "parentId",
                 message, created_at as "createdAt";`,
      [forumData.id, user.id, dto.parentId || null, dto.message.trim()],
    );

    const newMsg = insertRes.rows[0];
    return {
      ...newMsg,
      authorName: user.fullName || user.email.split('@')[0],
      authorRole: user.role,
      authorEmail: user.email,
    };
  }

  async updateForumConfig(
    lessonId: number,
    dto: { title?: string; description?: string; isClosed?: boolean },
    user: User,
  ) {
    await this.assertUnitTeacher(lessonId, user);

    const forum = await this.getUnitForum(lessonId, user);

    const res = await this.pool.query(
      `UPDATE unit_forums
          SET title = COALESCE($2, title),
              description = COALESCE($3, description),
              is_closed = COALESCE($4, is_closed),
              updated_at = now()
        WHERE id = $1
        RETURNING id, lesson_id as "lessonId", title, description, is_closed as "isClosed";`,
      [forum.id, dto.title, dto.description, dto.isClosed],
    );

    return res.rows[0];
  }

  // =========================================================================
  // 3. ACTIVIDADES PRÁCTICAS
  // =========================================================================

  async getUnitActivities(lessonId: number, user: User) {
    await this.assertUnitAccess(lessonId, user);

    const actRes = await this.pool.query(
      `SELECT ua.id, ua.lesson_id as "lessonId", ua.title, ua.description,
              ua.instructions, ua.due_date as "dueDate", ua.created_at as "createdAt"
       FROM unit_activities ua
       WHERE ua.lesson_id = $1
       ORDER BY ua.id ASC;`,
      [lessonId],
    );

    // Si es estudiante, incluir su entrega si existe
    const activitiesWithSubmissions = await Promise.all(
      actRes.rows.map(async (act) => {
        const subRes = await this.pool.query(
          `SELECT s.id, s.activity_id as "activityId", s.user_id as "userId",
                  s.content, s.file_url as "fileUrl", s.grade, s.feedback,
                  s.status, s.submitted_at as "submittedAt"
           FROM activity_submissions s
           WHERE s.activity_id = $1 AND s.user_id = $2;`,
          [act.id, user.id],
        );
        return {
          ...act,
          mySubmission: subRes.rows[0] || null,
        };
      }),
    );

    return activitiesWithSubmissions;
  }

  async createUnitActivity(
    lessonId: number,
    dto: { title: string; description?: string; instructions?: string; dueDate?: string },
    user: User,
  ) {
    await this.assertUnitTeacher(lessonId, user);

    const res = await this.pool.query(
      `INSERT INTO unit_activities (lesson_id, title, description, instructions, due_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, lesson_id as "lessonId", title, description, instructions, due_date as "dueDate", created_at as "createdAt";`,
      [lessonId, dto.title, dto.description || null, dto.instructions || null, dto.dueDate || null],
    );

    return res.rows[0];
  }

  async submitActivity(
    activityId: number,
    dto: { content?: string; fileUrl?: string },
    user: User,
  ) {
    // Verificar acceso
    const actRes = await this.pool.query(
      `SELECT ua.id, ua.lesson_id FROM unit_activities ua WHERE ua.id = $1;`,
      [activityId],
    );
    if (actRes.rowCount === 0) {
      throw new NotFoundException(`Actividad #${activityId} no encontrada`);
    }

    await this.assertUnitAccess(Number(actRes.rows[0].lesson_id), user);

    const res = await this.pool.query(
      `INSERT INTO activity_submissions (activity_id, user_id, content, file_url, status)
       VALUES ($1, $2, $3, $4, 'submitted')
       ON CONFLICT (activity_id, user_id) DO UPDATE
         SET content = EXCLUDED.content,
             file_url = EXCLUDED.file_url,
             status = 'submitted',
             updated_at = now()
       RETURNING id, activity_id as "activityId", user_id as "userId", content, file_url as "fileUrl", status, submitted_at as "submittedAt";`,
      [activityId, user.id, dto.content || null, dto.fileUrl || null],
    );

    return res.rows[0];
  }

  // =========================================================================
  // 4. EVALUACIONES / CUESTIONARIOS
  // =========================================================================

  async getUnitQuiz(lessonId: number, user: User) {
    await this.assertUnitAccess(lessonId, user);

    // Obtener quiz de la unidad
    const quizRes = await this.pool.query(
      `SELECT q.id, q.lesson_id as "lessonId", q.title, q.description,
              q.passing_score as "passingScore", q.max_attempts as "maxAttempts",
              q.time_limit_mins as "timeLimitMins", q.is_published as "isPublished",
              q.created_at as "createdAt"
       FROM quizzes q
       WHERE q.lesson_id = $1;`,
      [lessonId],
    );

    if (quizRes.rowCount === 0) {
      return null;
    }

    const quiz = quizRes.rows[0];
    const isTeacherOrAdmin =
      user.role === 'admin' || user.role === 'superadmin' || user.role === 'docente';

    // Obtener preguntas
    const questionsRes = await this.pool.query(
      `SELECT qq.id, qq.quiz_id as "quizId", qq.question_text as "questionText",
              qq.question_type as "questionType", qq.points, qq.order_index as "orderIndex",
              qq.explanation
       FROM quiz_questions qq
       WHERE qq.quiz_id = $1
       ORDER BY qq.order_index ASC, qq.id ASC;`,
      [quiz.id],
    );

    // Obtener opciones
    const questions = await Promise.all(
      questionsRes.rows.map(async (q) => {
        const optRes = await this.pool.query(
          `SELECT qo.id, qo.question_id as "questionId", qo.option_text as "optionText",
                  ${isTeacherOrAdmin ? 'qo.is_correct as "isCorrect",' : ''}
                  qo.order_index as "orderIndex"
           FROM quiz_options qo
           WHERE qo.question_id = $1
           ORDER BY qo.order_index ASC, qo.id ASC;`,
          [q.id],
        );
        return {
          ...q,
          options: optRes.rows,
        };
      }),
    );

    // Obtener intentos del estudiante
    const attemptsRes = await this.pool.query(
      `SELECT qa.id, qa.score, qa.passed, qa.attempt_number as "attemptNumber", qa.completed_at as "completedAt"
       FROM quiz_attempts qa
       WHERE qa.quiz_id = $1 AND qa.user_id = $2
       ORDER BY qa.attempt_number DESC;`,
      [quiz.id, user.id],
    );

    const attempts = attemptsRes.rows;
    const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => Number(a.score))) : 0;
    const hasPassed = attempts.some((a) => a.passed);

    return {
      ...quiz,
      questions,
      myAttempts: attempts,
      bestScore,
      hasPassed,
      totalQuestions: questions.length,
    };
  }

  async saveUnitQuiz(
    lessonId: number,
    dto: {
      title: string;
      description?: string;
      passingScore?: number;
      maxAttempts?: number;
      timeLimitMins?: number;
      questions?: Array<{
        questionText: string;
        questionType?: 'multiple_choice' | 'true_false' | 'short_answer';
        points?: number;
        explanation?: string;
        options: Array<{ optionText: string; isCorrect: boolean }>;
      }>;
    },
    user: User,
  ) {
    await this.assertUnitTeacher(lessonId, user);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Upsert Quiz
      const quizRes = await client.query(
        `INSERT INTO quizzes (lesson_id, title, description, passing_score, max_attempts, time_limit_mins)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (lesson_id) DO UPDATE
           SET title = EXCLUDED.title,
               description = EXCLUDED.description,
               passing_score = EXCLUDED.passing_score,
               max_attempts = EXCLUDED.max_attempts,
               time_limit_mins = EXCLUDED.time_limit_mins,
               updated_at = now()
         RETURNING id, lesson_id as "lessonId", title, passing_score as "passingScore";`,
        [
          lessonId,
          dto.title,
          dto.description || null,
          dto.passingScore ?? 70,
          dto.maxAttempts ?? 3,
          dto.timeLimitMins || null,
        ],
      );

      const quizId = quizRes.rows[0].id;

      // 2. Si se enviaron preguntas, recrear preguntas y opciones
      if (Array.isArray(dto.questions) && dto.questions.length > 0) {
        // Borrar preguntas previas en cascada
        await client.query(`DELETE FROM quiz_questions WHERE quiz_id = $1;`, [quizId]);

        for (let i = 0; i < dto.questions.length; i++) {
          const q = dto.questions[i];
          const qRes = await client.query(
            `INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, order_index, explanation)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id;`,
            [
              quizId,
              q.questionText,
              q.questionType || 'multiple_choice',
              q.points || 1,
              i + 1,
              q.explanation || null,
            ],
          );
          const qId = qRes.rows[0].id;

          if (Array.isArray(q.options)) {
            for (let j = 0; j < q.options.length; j++) {
              const opt = q.options[j];
              await client.query(
                `INSERT INTO quiz_options (question_id, option_text, is_correct, order_index)
                 VALUES ($1, $2, $3, $4);`,
                [qId, opt.optionText, Boolean(opt.isCorrect), j + 1],
              );
            }
          }
        }
      }

      await client.query('COMMIT');
      return this.getUnitQuiz(lessonId, user);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async submitQuizAttempt(
    quizId: number,
    answers: Record<string, number>, // { [questionId]: optionId }
    user: User,
  ) {
    const quizRes = await this.pool.query(
      `SELECT q.id, q.lesson_id, q.passing_score, q.max_attempts
       FROM quizzes q WHERE q.id = $1;`,
      [quizId],
    );
    if (quizRes.rowCount === 0) {
      throw new NotFoundException(`Evaluación #${quizId} no encontrada`);
    }

    const quiz = quizRes.rows[0];
    await this.assertUnitAccess(Number(quiz.lesson_id), user);

    // Verificar número de intentos
    const prevAttemptsRes = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2;`,
      [quizId, user.id],
    );
    const attemptCount = Number(prevAttemptsRes.rows[0]?.count) || 0;
    if (quiz.max_attempts && attemptCount >= quiz.max_attempts) {
      throw new BadRequestException(
        `Has alcanzado el límite máximo de ${quiz.max_attempts} intentos para esta evaluación`,
      );
    }

    // Obtener preguntas y opciones correctas para calificar en el servidor
    const questionsRes = await this.pool.query(
      `SELECT qq.id, qq.points, qo.id as correct_option_id
       FROM quiz_questions qq
       JOIN quiz_options qo ON qo.question_id = qq.id AND qo.is_correct = true
       WHERE qq.quiz_id = $1;`,
      [quizId],
    );

    const questions = questionsRes.rows;
    let earnedPoints = 0;
    let totalPoints = 0;

    for (const q of questions) {
      const qPoints = Number(q.points) || 1;
      totalPoints += qPoints;

      const userSelectedOption = answers[q.id];
      if (userSelectedOption && Number(userSelectedOption) === Number(q.correct_option_id)) {
        earnedPoints += qPoints;
      }
    }

    const calculatedScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 100;
    const passed = calculatedScore >= (quiz.passing_score ?? 70);

    const attemptNumber = attemptCount + 1;

    // Guardar intento
    const insertRes = await this.pool.query(
      `INSERT INTO quiz_attempts (quiz_id, user_id, score, passed, answers, attempt_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, score, passed, attempt_number as "attemptNumber", completed_at as "completedAt";`,
      [quizId, user.id, calculatedScore, passed, JSON.stringify(answers), attemptNumber],
    );

    return {
      attempt: insertRes.rows[0],
      score: calculatedScore,
      passed,
      passingScore: quiz.passing_score,
      earnedPoints,
      totalPoints,
    };
  }
}
