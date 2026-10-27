// Script de seed para Railway y entornos de producción/desarrollo
const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
  const url =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5433}/${process.env.DB_NAME || 'plataforma_cursos'}`;

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    console.log('[seed] Iniciando configuración de usuarios y datos...');

    const passwordHash = await bcrypt.hash('12345678', 10);

    // 1. Crear o actualizar los 3 usuarios solicitados
    const users = [
      { email: 'estudiante@gmail.com', name: 'Estudiante Demo', role: 'estudiante' },
      { email: 'docente@gmail.com', name: 'Docente Demo', role: 'docente' },
      { email: 'administrador@gmail.com', name: 'Administrador Demo', role: 'admin' },
    ];

    const userIds = {};

    for (const u of users) {
      const res = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_active, email_verified_at)
         VALUES ($1, $2, $3, $4, true, now())
         ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             full_name = EXCLUDED.full_name,
             role = EXCLUDED.role,
             is_active = true
         RETURNING id;`,
        [u.email, passwordHash, u.name, u.role],
      );
      userIds[u.role] = res.rows[0].id;
      console.log(`[seed] Usuario listo: ${u.email} (rol: ${u.role}, id: ${res.rows[0].id})`);
    }

    const adminId = userIds['admin'];
    const docenteId = userIds['docente'];
    const estudianteId = userIds['estudiante'];

    // 2. Asegurar video aprobado y video pendiente
    let videoId;
    const existingVideo = await client.query(
      `SELECT id FROM videos WHERE provider = 'youtube' AND provider_ref = 'dQw4w9WgXcQ' AND deleted_at IS NULL LIMIT 1`,
    );
    if (existingVideo.rowCount > 0) {
      videoId = existingVideo.rows[0].id;
      await client.query(
        `UPDATE videos SET status = 'approved', duration_seconds = 213 WHERE id = $1`,
        [videoId],
      );
    } else {
      const ins = await client.query(
        `INSERT INTO videos (title, provider, provider_ref, duration_seconds, uploaded_by, status)
         VALUES ('Clase Magistral de Demostración', 'youtube', 'dQw4w9WgXcQ', 213, $1, 'approved')
         RETURNING id;`,
        [docenteId],
      );
      videoId = ins.rows[0].id;
    }

    const existingPending = await client.query(
      `SELECT id FROM videos WHERE provider = 'youtube' AND provider_ref = 'jNQXAC9IVRw' AND deleted_at IS NULL LIMIT 1`,
    );
    if (existingPending.rowCount === 0) {
      await client.query(
        `INSERT INTO videos (title, provider, provider_ref, duration_seconds, uploaded_by, status)
         VALUES ('Taller Práctico Avanzado (En Revisión)', 'youtube', 'jNQXAC9IVRw', 19, $1, 'pending')`,
        [docenteId],
      );
    }

    // 3. Asegurar Curso Gratuito
    const freeCourseRes = await client.query(
      `INSERT INTO courses (title, slug, description, price, currency, status, min_watch_percentage, created_by)
       VALUES ('Excel Empresarial Básico', 'excel-empresarial-basico', 'Domina hojas de cálculo, fórmulas avanzadas y tablas dinámicas para el entorno corporativo.', 0, 'BOB', 'published', 85, $1)
       ON CONFLICT (slug) DO UPDATE
       SET status = 'published', price = 0
       RETURNING id;`,
      [adminId],
    );
    const freeCourseId = freeCourseRes.rows[0].id;

    // Módulo y lecciones del curso gratuito
    let freeModRes = await client.query(
      `SELECT id FROM modules WHERE course_id = $1 AND title = 'Módulo 1: Fundamentos de Excel' LIMIT 1`,
      [freeCourseId],
    );
    let freeModId;
    if (freeModRes.rowCount === 0) {
      const inserted = await client.query(
        `INSERT INTO modules (course_id, title, description, order_index)
         VALUES ($1, 'Módulo 1: Fundamentos de Excel', 'Entorno, celdas y funciones elementales', 1)
         RETURNING id;`,
        [freeCourseId],
      );
      freeModId = inserted.rows[0].id;
    } else {
      freeModId = freeModRes.rows[0].id;
    }

    const freeLesson1 = await client.query(
      `INSERT INTO lessons (module_id, video_id, title, description, order_index, status)
       VALUES ($1, $2, '01. Interfaz y conceptos básicos de Excel', 'Navegación general y tipos de datos', 1, 'published')
       ON CONFLICT DO NOTHING
       RETURNING id;`,
      [freeModId, videoId],
    );
    await client.query(
      `INSERT INTO lessons (module_id, video_id, title, description, order_index, status)
       VALUES ($1, $2, '02. Fórmulas y funciones fundamentales', 'Operaciones aritméticas y referencias relativas', 2, 'published')
       ON CONFLICT DO NOTHING;`,
      [freeModId, videoId],
    );

    // 4. Asegurar Curso de Pago
    const paidCourseRes = await client.query(
      `INSERT INTO courses (title, slug, description, price, currency, status, min_watch_percentage, created_by)
       VALUES ('Auditoría Interna Básica', 'auditoria-interna-basica', 'Metodología integral de control, gestión de riesgos y elaboración de informes según normas internacionales.', 350, 'BOB', 'published', 85, $1)
       ON CONFLICT (slug) DO UPDATE
       SET status = 'published', price = 350
       RETURNING id;`,
      [adminId],
    );
    const paidCourseId = paidCourseRes.rows[0].id;

    let paidMod1Res = await client.query(
      `SELECT id FROM modules WHERE course_id = $1 AND order_index = 1 LIMIT 1`,
      [paidCourseId],
    );
    let paidMod1Id;
    if (paidMod1Res.rowCount === 0) {
      const ins = await client.query(
        `INSERT INTO modules (course_id, title, description, order_index)
         VALUES ($1, 'Módulo 1: Marco Normativo y Fundamentos', 'Normas internacionales y conceptos', 1)
         RETURNING id;`,
        [paidCourseId],
      );
      paidMod1Id = ins.rows[0].id;
    } else {
      paidMod1Id = paidMod1Res.rows[0].id;
    }

    let paidMod2Res = await client.query(
      `SELECT id FROM modules WHERE course_id = $1 AND order_index = 2 LIMIT 1`,
      [paidCourseId],
    );
    let paidMod2Id;
    if (paidMod2Res.rowCount === 0) {
      const ins = await client.query(
        `INSERT INTO modules (course_id, title, description, order_index)
         VALUES ($1, 'Módulo 2: Planificación y Ejecución de la Auditoría', 'Mapeo de riesgos e informes', 2)
         RETURNING id;`,
        [paidCourseId],
      );
      paidMod2Id = ins.rows[0].id;
    } else {
      paidMod2Id = paidMod2Res.rows[0].id;
    }

    await client.query(
      `INSERT INTO lessons (module_id, video_id, title, description, order_index, status)
       VALUES ($1, $2, '01. Concepto y marco normativo de auditoría', 'Definiciones clave y NIA', 1, 'published')
       ON CONFLICT DO NOTHING;`,
      [paidMod1Id, videoId],
    );
    await client.query(
      `INSERT INTO lessons (module_id, video_id, title, description, order_index, status)
       VALUES ($1, $2, '02. Roles y responsabilidades del auditor', 'Ética profesional y código de conducta', 2, 'published')
       ON CONFLICT DO NOTHING;`,
      [paidMod1Id, videoId],
    );
    await client.query(
      `INSERT INTO lessons (module_id, video_id, title, description, order_index, status)
       VALUES ($1, $2, '03. Planificación de la auditoría interna', 'Matrices de riesgo y programas', 1, 'published')
       ON CONFLICT DO NOTHING;`,
      [paidMod2Id, videoId],
    );
    await client.query(
      `INSERT INTO lessons (module_id, video_id, title, description, order_index, status)
       VALUES ($1, $2, '04. Informe de auditoría y seguimiento', 'Hallazgos y recomendaciones', 2, 'published')
       ON CONFLICT DO NOTHING;`,
      [paidMod2Id, videoId],
    );

    // 5. Inscripción de estudiante en curso gratuito
    const enrollRes = await client.query(
      `INSERT INTO enrollments (user_id, course_id, enrolled_by, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (user_id, course_id) DO UPDATE
       SET status = 'active'
       RETURNING id;`,
      [estudianteId, freeCourseId, adminId],
    );
    const enrollmentId = enrollRes.rows[0].id;

    // Marcar lección 1 como completada
    const getLesson1Res = await client.query(
      `SELECT id FROM lessons WHERE module_id = $1 AND order_index = 1 LIMIT 1`,
      [freeModId],
    );
    if (getLesson1Res.rowCount > 0) {
      const l1Id = getLesson1Res.rows[0].id;
      await client.query(
        `INSERT INTO lesson_progress (enrollment_id, lesson_id, watched_blocks, last_position_seconds, is_completed, completed_at)
         VALUES ($1, $2, ARRAY[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21], 213, true, now())
         ON CONFLICT (enrollment_id, lesson_id) DO UPDATE
         SET is_completed = true, completed_at = now();`,
        [enrollmentId, l1Id],
      );
    }

    // 6. Orden pendiente de estudiante para el curso de pago
    await client.query(
      `INSERT INTO orders (user_id, course_id, amount, currency, status, receipt_url)
       VALUES ($1, $2, 350, 'BOB', 'pending', 'comprobante-transferencia-demo.pdf')
       ON CONFLICT DO NOTHING;`,
      [estudianteId, paidCourseId],
    );

    console.log('[seed] Configuración completada exitosamente.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[seed] Error:', err);
  process.exit(1);
});
