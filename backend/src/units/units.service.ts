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

  // =========================================================================
  // 5. LIBRO DE CALIFICACIONES (GRADEBOOK)
  // =========================================================================

  /**
   * Verifica permisos de docente sobre un curso
   */
  async assertCourseTeacher(courseId: number, user: User) {
    if (user.role === 'admin' || user.role === 'superadmin') return;

    const [course] = await this.db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!course) {
      throw new NotFoundException(`Curso #${courseId} no encontrado`);
    }

    if (Number(course.createdBy) === Number(user.id)) return;

    const [assigned] = await this.db
      .select()
      .from(courseDocentes)
      .where(and(eq(courseDocentes.courseId, courseId), eq(courseDocentes.userId, user.id)))
      .limit(1);

    if (!assigned) {
      throw new ForbiddenException('No tienes permiso de docente sobre este curso');
    }
  }

  /**
   * Obtiene la matriz completa del Gradebook para un curso (Docente / Admin)
   */
  async getCourseGradebook(courseId: number, user: User) {
    await this.assertCourseTeacher(courseId, user);

    const [course] = await this.db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!course) {
      throw new NotFoundException(`Curso #${courseId} no encontrado`);
    }

    // 1. Obtener módulos y lecciones (unidades)
    const modulesRes = await this.pool.query(
      `SELECT m.id as module_id, m.title as module_title, m.order_index as module_order,
              l.id as lesson_id, l.title as lesson_title, l.order_index as lesson_order
       FROM modules m
       JOIN lessons l ON l.module_id = m.id AND l.deleted_at IS NULL AND l.status = 'published'
       WHERE m.course_id = $1 AND m.deleted_at IS NULL
       ORDER BY m.order_index ASC, l.order_index ASC;`,
      [courseId],
    );

    // 2. Obtener todas las actividades del curso
    const activitiesRes = await this.pool.query(
      `SELECT a.id, a.lesson_id as "lessonId", a.title, a.due_date as "dueDate"
       FROM unit_activities a
       JOIN lessons l ON l.id = a.lesson_id AND l.deleted_at IS NULL
       JOIN modules m ON m.id = l.module_id AND m.deleted_at IS NULL
       WHERE m.course_id = $1
       ORDER BY a.created_at ASC;`,
      [courseId],
    );

    // 3. Obtener todos los cuestionarios del curso
    const quizzesRes = await this.pool.query(
      `SELECT q.id, q.lesson_id as "lessonId", q.title, q.passing_score as "passingScore", q.max_attempts as "maxAttempts"
       FROM quizzes q
       JOIN lessons l ON l.id = q.lesson_id AND l.deleted_at IS NULL
       JOIN modules m ON m.id = l.module_id AND m.deleted_at IS NULL
       WHERE m.course_id = $1
       ORDER BY q.created_at ASC;`,
      [courseId],
    );

    // 4. Obtener todos los estudiantes inscritos
    const studentsRes = await this.pool.query(
      `SELECT e.id as enrollment_id, e.user_id as "userId", e.status as enrollment_status, e.enrolled_at as "enrolledAt",
              u.full_name as "fullName", u.email
       FROM enrollments e
       JOIN users u ON u.id = e.user_id
       WHERE e.course_id = $1 AND e.status != 'cancelled'
       ORDER BY u.full_name ASC;`,
      [courseId],
    );

    // 5. Obtener todas las entregas de actividades del curso
    const submissionsRes = await this.pool.query(
      `SELECT s.id, s.activity_id as "activityId", s.user_id as "userId", s.content, s.file_url as "fileUrl",
              s.grade, s.feedback, s.status, s.submitted_at as "submittedAt", s.updated_at as "updatedAt"
       FROM activity_submissions s
       JOIN unit_activities a ON a.id = s.activity_id
       JOIN lessons l ON l.id = a.lesson_id
       JOIN modules m ON m.id = l.module_id
       WHERE m.course_id = $1;`,
      [courseId],
    );

    // 6. Obtener mejores puntajes de cuestionarios por usuario y quiz
    const attemptsRes = await this.pool.query(
      `SELECT qa.quiz_id as "quizId", qa.user_id as "userId",
              MAX(qa.score)::numeric as "bestScore",
              BOOL_OR(qa.passed) as "passed",
              COUNT(qa.id)::int as "attemptsCount"
       FROM quiz_attempts qa
       JOIN quizzes q ON q.id = qa.quiz_id
       JOIN lessons l ON l.id = q.lesson_id
       JOIN modules m ON m.id = l.module_id
       WHERE m.course_id = $1
       GROUP BY qa.quiz_id, qa.user_id;`,
      [courseId],
    );

    // Mapear estructuras auxiliares
    const submissionsByUser = new Map<number, any[]>();
    for (const sub of submissionsRes.rows) {
      const uid = Number(sub.userId);
      if (!submissionsByUser.has(uid)) submissionsByUser.set(uid, []);
      submissionsByUser.get(uid)!.push({
        ...sub,
        grade: sub.grade !== null ? Number(sub.grade) : null,
      });
    }

    const attemptsByUser = new Map<number, any[]>();
    for (const att of attemptsRes.rows) {
      const uid = Number(att.userId);
      if (!attemptsByUser.has(uid)) attemptsByUser.set(uid, []);
      attemptsByUser.get(uid)!.push({
        ...att,
        bestScore: Number(att.bestScore),
      });
    }

    const totalCourseActivities = activitiesRes.rows.length;
    const totalCourseQuizzes = quizzesRes.rows.length;

    // Construir tabla de estudiantes
    const students = studentsRes.rows.map((st) => {
      const uid = Number(st.userId);
      const userSubs = submissionsByUser.get(uid) || [];
      const userAtts = attemptsByUser.get(uid) || [];

      // Actividades: mapa por activityId
      const activitiesMap: Record<number, any> = {};
      let totalActivityScore = 0;
      let gradedActivitiesCount = 0;

      for (const act of activitiesRes.rows) {
        const sub = userSubs.find((s) => s.activityId === act.id);
        if (sub) {
          activitiesMap[act.id] = sub;
          if (sub.grade !== null && sub.status === 'graded') {
            totalActivityScore += sub.grade;
            gradedActivitiesCount++;
          }
        } else {
          activitiesMap[act.id] = null;
        }
      }

      // Quizzes: mapa por quizId
      const quizzesMap: Record<number, any> = {};
      let totalQuizScore = 0;
      let completedQuizzesCount = 0;

      for (const qz of quizzesRes.rows) {
        const att = userAtts.find((a) => a.quizId === qz.id);
        if (att) {
          quizzesMap[qz.id] = att;
          totalQuizScore += att.bestScore;
          completedQuizzesCount++;
        } else {
          quizzesMap[qz.id] = null;
        }
      }

      const avgActivityScore =
        gradedActivitiesCount > 0 ? Math.round(totalActivityScore / gradedActivitiesCount) : null;
      const avgQuizScore =
        completedQuizzesCount > 0 ? Math.round(totalQuizScore / completedQuizzesCount) : null;

      // Promedio general del curso (50% actividades, 50% evaluaciones si ambos existen)
      let finalGrade: number | null = null;
      if (avgActivityScore !== null && avgQuizScore !== null) {
        finalGrade = Math.round((avgActivityScore + avgQuizScore) / 2);
      } else if (avgActivityScore !== null) {
        finalGrade = avgActivityScore;
      } else if (avgQuizScore !== null) {
        finalGrade = avgQuizScore;
      }

      return {
        userId: uid,
        enrollmentId: Number(st.enrollment_id),
        enrollmentStatus: st.enrollment_status,
        enrolledAt: st.enrolledAt,
        fullName: st.fullName,
        email: st.email,
        activities: activitiesMap,
        quizzes: quizzesMap,
        stats: {
          submittedActivitiesCount: userSubs.length,
          gradedActivitiesCount,
          totalActivities: totalCourseActivities,
          avgActivityScore,
          passedQuizzesCount: userAtts.filter((a) => a.passed).length,
          totalQuizzes: totalCourseQuizzes,
          avgQuizScore,
          finalGrade,
        },
      };
    });

    return {
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
      },
      units: modulesRes.rows,
      activities: activitiesRes.rows,
      quizzes: quizzesRes.rows,
      students,
    };
  }

  /**
   * Obtiene todas las entregas para una actividad específica (Docente / Admin)
   */
  async getActivitySubmissions(activityId: number, user: User) {
    const actRes = await this.pool.query(
      `SELECT a.id, a.lesson_id, a.title, a.instructions, a.due_date
       FROM unit_activities a
       WHERE a.id = $1;`,
      [activityId],
    );

    if (actRes.rowCount === 0) {
      throw new NotFoundException(`Actividad #${activityId} no encontrada`);
    }

    const activity = actRes.rows[0];
    await this.assertUnitTeacher(activity.lesson_id, user);

    const subsRes = await this.pool.query(
      `SELECT s.id, s.activity_id as "activityId", s.user_id as "userId", s.content, s.file_url as "fileUrl",
              s.grade, s.feedback, s.status, s.submitted_at as "submittedAt", s.updated_at as "updatedAt",
              u.full_name as "studentName", u.email as "studentEmail"
       FROM activity_submissions s
       JOIN users u ON u.id = s.user_id
       WHERE s.activity_id = $1
       ORDER BY s.submitted_at DESC;`,
      [activityId],
    );

    return {
      activity,
      submissions: subsRes.rows.map((r) => ({
        ...r,
        grade: r.grade !== null ? Number(r.grade) : null,
      })),
    };
  }

  /**
   * Califica y proporciona retroalimentación a una entrega de actividad (Docente / Admin)
   */
  async gradeActivitySubmission(
    submissionId: number,
    dto: { grade: number; feedback?: string },
    user: User,
  ) {
    const subRes = await this.pool.query(
      `SELECT s.id, s.activity_id, a.lesson_id, s.user_id
       FROM activity_submissions s
       JOIN unit_activities a ON a.id = s.activity_id
       WHERE s.id = $1;`,
      [submissionId],
    );

    if (subRes.rowCount === 0) {
      throw new NotFoundException(`Entrega #${submissionId} no encontrada`);
    }

    const sub = subRes.rows[0];
    await this.assertUnitTeacher(sub.lesson_id, user);

    if (dto.grade < 0 || dto.grade > 100) {
      throw new BadRequestException('La calificación debe estar entre 0 y 100 puntos');
    }

    const updateRes = await this.pool.query(
      `UPDATE activity_submissions
          SET grade = $1,
              feedback = $2,
              status = 'graded',
              updated_at = now()
        WHERE id = $3
        RETURNING id, activity_id as "activityId", user_id as "userId", grade, feedback, status,
                  submitted_at as "submittedAt", updated_at as "updatedAt";`,
      [dto.grade, dto.feedback || null, submissionId],
    );

    return {
      ...updateRes.rows[0],
      grade: Number(updateRes.rows[0].grade),
    };
  }

  /**
   * Obtiene el reporte y desglose de calificaciones del estudiante para un curso (Estudiante)
   */
  async getMyGrades(courseId: number, user: User) {
    // 1. Verificar inscripción
    const enrollRes = await this.pool.query(
      `SELECT id, status, enrolled_at as "enrolledAt"
       FROM enrollments
       WHERE user_id = $1 AND course_id = $2 AND status != 'cancelled';`,
      [user.id, courseId],
    );

    if (enrollRes.rowCount === 0) {
      throw new ForbiddenException('No tienes una inscripción activa a este curso');
    }

    const [course] = await this.db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!course) {
      throw new NotFoundException(`Curso #${courseId} no encontrado`);
    }

    // 2. Módulos y lecciones (unidades)
    const modulesRes = await this.pool.query(
      `SELECT m.id as module_id, m.title as module_title, m.order_index as module_order,
              l.id as lesson_id, l.title as lesson_title, l.order_index as lesson_order,
              lp.is_completed as lesson_completed
       FROM modules m
       JOIN lessons l ON l.module_id = m.id AND l.deleted_at IS NULL AND l.status = 'published'
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.enrollment_id = $2
       WHERE m.course_id = $1 AND m.deleted_at IS NULL
       ORDER BY m.order_index ASC, l.order_index ASC;`,
      [courseId, enrollRes.rows[0].id],
    );

    // 3. Actividades del estudiante
    const activitiesRes = await this.pool.query(
      `SELECT a.id, a.lesson_id as "lessonId", a.title, a.description, a.due_date as "dueDate",
              s.id as "submissionId", s.content, s.file_url as "fileUrl", s.grade, s.feedback,
              s.status, s.submitted_at as "submittedAt", s.updated_at as "updatedAt"
       FROM unit_activities a
       JOIN lessons l ON l.id = a.lesson_id AND l.deleted_at IS NULL
       JOIN modules m ON m.id = l.module_id AND m.deleted_at IS NULL
       LEFT JOIN activity_submissions s ON s.activity_id = a.id AND s.user_id = $2
       WHERE m.course_id = $1
       ORDER BY a.created_at ASC;`,
      [courseId, user.id],
    );

    // 4. Evaluaciones del estudiante
    const quizzesRes = await this.pool.query(
      `SELECT q.id, q.lesson_id as "lessonId", q.title, q.description,
              q.passing_score as "passingScore", q.max_attempts as "maxAttempts",
              MAX(qa.score)::numeric as "bestScore",
              BOOL_OR(qa.passed) as "passed",
              COUNT(qa.id)::int as "attemptsCount"
       FROM quizzes q
       JOIN lessons l ON l.id = q.lesson_id AND l.deleted_at IS NULL
       JOIN modules m ON m.id = l.module_id AND m.deleted_at IS NULL
       LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = $2
       WHERE m.course_id = $1
       GROUP BY q.id, q.lesson_id, q.title, q.description, q.passing_score, q.max_attempts
       ORDER BY q.created_at ASC;`,
      [courseId, user.id],
    );

    // Cálculos de resumen
    let totalActivityGrade = 0;
    let gradedActivities = 0;
    const activities = activitiesRes.rows.map((a) => {
      const grade = a.grade !== null ? Number(a.grade) : null;
      if (grade !== null && a.status === 'graded') {
        totalActivityGrade += grade;
        gradedActivities++;
      }
      return {
        ...a,
        grade,
      };
    });

    let totalQuizGrade = 0;
    let completedQuizzes = 0;
    let passedQuizzes = 0;
    const quizzes = quizzesRes.rows.map((q) => {
      const bestScore = q.bestScore !== null ? Number(q.bestScore) : null;
      if (bestScore !== null) {
        totalQuizGrade += bestScore;
        completedQuizzes++;
        if (q.passed) passedQuizzes++;
      }
      return {
        ...q,
        bestScore,
        passed: Boolean(q.passed),
      };
    });

    const avgActivityScore = gradedActivities > 0 ? Math.round(totalActivityGrade / gradedActivities) : null;
    const avgQuizScore = completedQuizzes > 0 ? Math.round(totalQuizGrade / completedQuizzes) : null;

    let finalGrade: number | null = null;
    if (avgActivityScore !== null && avgQuizScore !== null) {
      finalGrade = Math.round((avgActivityScore + avgQuizScore) / 2);
    } else if (avgActivityScore !== null) {
      finalGrade = avgActivityScore;
    } else if (avgQuizScore !== null) {
      finalGrade = avgQuizScore;
    }

    return {
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
      },
      enrollment: enrollRes.rows[0],
      summary: {
        finalGrade,
        avgActivityScore,
        avgQuizScore,
        totalActivities: activities.length,
        submittedActivities: activities.filter((a) => a.submissionId).length,
        gradedActivities,
        totalQuizzes: quizzes.length,
        passedQuizzes,
      },
      activities,
      quizzes,
      modules: modulesRes.rows,
    };
  }

  /**
   * Obtiene calificaciones del estudiante buscando por slug de curso
   */
  async getMyGradesBySlug(slug: string, user: User) {
    const [course] = await this.db
      .select()
      .from(courses)
      .where(eq(courses.slug, slug))
      .limit(1);

    if (!course) {
      throw new NotFoundException(`Curso con slug '${slug}' no encontrado`);
    }

    return this.getMyGrades(course.id, user);
  }
}
