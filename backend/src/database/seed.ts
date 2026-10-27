/**
 * seed.ts — Datos de demostración idempotentes
 *
 * USO:
 *   npm run seed            → inserta datos si no existen
 *   npm run seed -- --reset → borra todos los datos de demo y los recrea
 *
 * SEGURIDAD: se niega a correr con NODE_ENV=production
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

// Bloquear en producción
if (process.env.NODE_ENV === 'production') {
  console.error('❌  El seed NO puede ejecutarse en NODE_ENV=production');
  process.exit(1);
}

// ─────────────── Video de demo ───────────────
// ID de YouTube y duración en segundos (se puede cambiar aquí)
const DEMO_VIDEO_ID = 'dQw4w9WgXcQ';    // Rick Astley - Never Gonna Give You Up
const DEMO_VIDEO_DURATION = 213;          // 3 min 33 s

// Segundo video (pendiente de aprobación)
const PENDING_VIDEO_ID = 'jNQXAC9IVRw'; // Me at the zoo
const PENDING_VIDEO_DURATION = 19;

// ─────────────── Contraseñas de demo ─────────
const DEMO_PASSWORDS: Record<string, string> = {
  superadmin: 'SuperAdmin2024!',
  admin:      'Admin2024!',
  docente:    'Docente2024!',
  estudiante: 'Estudiante2024!',
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
});

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');

  const client = await pool.connect();
  try {
    if (reset) {
      console.log('🗑️  --reset: borrando datos de demo...');
      await client.query('BEGIN');
      // Orden de borrado respetando FK
      await client.query(`DELETE FROM lesson_progress WHERE enrollment_id IN (
        SELECT id FROM enrollments WHERE user_id IN (
          SELECT id FROM users WHERE email LIKE '%@demo.com'))
      `);
      await client.query(`DELETE FROM enrollments WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@demo.com')
      `);
      await client.query(`DELETE FROM orders WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@demo.com')
      `);
      await client.query(`DELETE FROM lessons WHERE module_id IN (
        SELECT id FROM modules WHERE course_id IN (
          SELECT id FROM courses WHERE slug IN ('auditoria-interna-basica','excel-empresarial-basico')))
      `);
      await client.query(`DELETE FROM modules WHERE course_id IN (
        SELECT id FROM courses WHERE slug IN ('auditoria-interna-basica','excel-empresarial-basico'))
      `);
      await client.query(`DELETE FROM courses WHERE slug IN ('auditoria-interna-basica','excel-empresarial-basico')`);
      await client.query(`DELETE FROM videos WHERE provider_ref = $1`, [PENDING_VIDEO_ID]);
      await client.query(`DELETE FROM users WHERE email LIKE '%@demo.com'`);
      await client.query('COMMIT');
      console.log('✅  Datos anteriores eliminados.\n');
    }

    console.log('🌱  Iniciando seed de datos de demostración...\n');

    // ─── 1. USUARIOS ───────────────────────────────────────────────────────
    console.log('👥  Creando usuarios de demo...');
    const userRows: Record<string, number> = {};

    for (const [role, password] of Object.entries(DEMO_PASSWORDS)) {
      const email = `${role}@demo.com`;
      const existing = await client.query(
        `SELECT id FROM users WHERE email = $1`, [email]
      );
      if (existing.rowCount && existing.rowCount > 0) {
        userRows[role] = existing.rows[0].id;
        console.log(`   ↳  ${email} ya existe (id=${userRows[role]})`);
        continue;
      }
      const passwordHash = await hashPassword(password);
      const ins = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id`,
        [email, passwordHash, role.charAt(0).toUpperCase() + role.slice(1) + ' Demo', role]
      );
      userRows[role] = ins.rows[0].id;
      console.log(`   ✅  ${email} creado (id=${userRows[role]})`);
    }

    // Imprimir credenciales (SOLO en consola, nunca en frontend)
    console.log('\n📋  CREDENCIALES DE DEMO (consola únicamente):');
    for (const [role, password] of Object.entries(DEMO_PASSWORDS)) {
      console.log(`   ${role}@demo.com  →  ${password}`);
    }

    // ─── 2. VIDEOS ─────────────────────────────────────────────────────────
    console.log('\n🎬  Creando videos de demo...');
    const docenteId = userRows['docente'];

    let approvedVideoId: number;
    const existingApproved = await client.query(
      `SELECT id FROM videos WHERE provider_ref = $1`, [DEMO_VIDEO_ID]
    );
    if (existingApproved.rowCount && existingApproved.rowCount > 0) {
      approvedVideoId = existingApproved.rows[0].id;
      console.log(`   ↳  Video aprobado ya existe (id=${approvedVideoId})`);
    } else {
      const vRes = await client.query(
        `INSERT INTO videos (title, provider, provider_ref, duration_seconds, uploaded_by, status, reviewed_by, reviewed_at)
         VALUES ($1, 'youtube', $2, $3, $4, 'approved', $5, now())
         RETURNING id`,
        ['Introducción al módulo – Demo', DEMO_VIDEO_ID, DEMO_VIDEO_DURATION, docenteId, userRows['admin']]
      );
      approvedVideoId = vRes.rows[0].id;
      console.log(`   ✅  Video aprobado creado (id=${approvedVideoId})`);
    }

    let pendingVideoId: number;
    const existingPending = await client.query(
      `SELECT id FROM videos WHERE provider_ref = $1`, [PENDING_VIDEO_ID]
    );
    if (existingPending.rowCount && existingPending.rowCount > 0) {
      pendingVideoId = existingPending.rows[0].id;
      console.log(`   ↳  Video pendiente ya existe (id=${pendingVideoId})`);
    } else {
      const pvRes = await client.query(
        `INSERT INTO videos (title, provider, provider_ref, duration_seconds, uploaded_by, status)
         VALUES ($1, 'youtube', $2, $3, $4, 'pending')
         RETURNING id`,
        ['Clase adicional – pendiente de revisión', PENDING_VIDEO_ID, PENDING_VIDEO_DURATION, docenteId]
      );
      pendingVideoId = pvRes.rows[0].id;
      console.log(`   ✅  Video pendiente creado (id=${pendingVideoId})`);
    }

    // ─── 3. CURSO DE PAGO ──────────────────────────────────────────────────
    console.log('\n📚  Creando curso de pago "Auditoría interna básica"...');
    let paidCourseId: number;
    const existingPaid = await client.query(
      `SELECT id FROM courses WHERE slug = 'auditoria-interna-basica'`
    );
    if (existingPaid.rowCount && existingPaid.rowCount > 0) {
      paidCourseId = existingPaid.rows[0].id;
      console.log(`   ↳  Curso ya existe (id=${paidCourseId})`);
    } else {
      const cRes = await client.query(
        `INSERT INTO courses (title, slug, description, price, currency, status, min_watch_percentage, created_by)
         VALUES ($1, 'auditoria-interna-basica', $2, '350.00', 'BOB', 'published', 85, $3)
         RETURNING id`,
        [
          'Auditoría Interna Básica',
          'Aprende los fundamentos de auditoría interna según estándares IIA. Curso completo con casos reales y certificación.',
          userRows['admin'],
        ]
      );
      paidCourseId = cRes.rows[0].id;
      console.log(`   ✅  Curso de pago creado (id=${paidCourseId})`);
    }

    // Módulos del curso de pago
    const paidModules: number[] = [];
    const paidModuleTitles = [
      'Módulo 1: Fundamentos de Auditoría Interna',
      'Módulo 2: Técnicas y Procedimientos de Auditoría',
    ];
    for (let i = 0; i < paidModuleTitles.length; i++) {
      const existingMod = await client.query(
        `SELECT id FROM modules WHERE course_id = $1 AND order_index = $2`,
        [paidCourseId, i + 1]
      );
      if (existingMod.rowCount && existingMod.rowCount > 0) {
        paidModules.push(existingMod.rows[0].id);
        console.log(`   ↳  Módulo ${i + 1} ya existe`);
      } else {
        const mRes = await client.query(
          `INSERT INTO modules (course_id, title, order_index)
           VALUES ($1, $2, $3) RETURNING id`,
          [paidCourseId, paidModuleTitles[i], i + 1]
        );
        paidModules.push(mRes.rows[0].id);
        console.log(`   ✅  Módulo ${i + 1} creado`);
      }
    }

    // Lecciones del curso de pago (2 por módulo = 4 total, todas published)
    const paidLessonTitles = [
      // Módulo 1
      ['01. Concepto y marco normativo de auditoría', '02. Roles y responsabilidades del auditor'],
      // Módulo 2
      ['03. Planificación de la auditoría interna', '04. Informe de auditoría y seguimiento'],
    ];
    const paidLessonIds: number[] = [];
    for (let m = 0; m < paidModules.length; m++) {
      for (let l = 0; l < paidLessonTitles[m].length; l++) {
        const existingL = await client.query(
          `SELECT id FROM lessons WHERE module_id = $1 AND order_index = $2`,
          [paidModules[m], l + 1]
        );
        if (existingL.rowCount && existingL.rowCount > 0) {
          paidLessonIds.push(existingL.rows[0].id);
        } else {
          const lRes = await client.query(
            `INSERT INTO lessons (module_id, video_id, title, order_index, status)
             VALUES ($1, $2, $3, $4, 'published') RETURNING id`,
            [paidModules[m], approvedVideoId, paidLessonTitles[m][l], l + 1]
          );
          paidLessonIds.push(lRes.rows[0].id);
          console.log(`   ✅  Lección "${paidLessonTitles[m][l]}" creada`);
        }
      }
    }

    // ─── 4. CURSO GRATUITO ─────────────────────────────────────────────────
    console.log('\n📗  Creando curso gratuito "Excel Empresarial Básico"...');
    let freeCourseId: number;
    const existingFree = await client.query(
      `SELECT id FROM courses WHERE slug = 'excel-empresarial-basico'`
    );
    if (existingFree.rowCount && existingFree.rowCount > 0) {
      freeCourseId = existingFree.rows[0].id;
      console.log(`   ↳  Curso gratuito ya existe (id=${freeCourseId})`);
    } else {
      const cfRes = await client.query(
        `INSERT INTO courses (title, slug, description, price, currency, status, min_watch_percentage, created_by)
         VALUES ($1, 'excel-empresarial-basico', $2, '0.00', 'BOB', 'published', 85, $3)
         RETURNING id`,
        [
          'Excel Empresarial Básico',
          'Domina las herramientas esenciales de Excel para el entorno empresarial. Completamente gratuito.',
          userRows['admin'],
        ]
      );
      freeCourseId = cfRes.rows[0].id;
      console.log(`   ✅  Curso gratuito creado (id=${freeCourseId})`);
    }

    let freeModuleId: number;
    const existingFreeMod = await client.query(
      `SELECT id FROM modules WHERE course_id = $1 AND order_index = 1`,
      [freeCourseId]
    );
    if (existingFreeMod.rowCount && existingFreeMod.rowCount > 0) {
      freeModuleId = existingFreeMod.rows[0].id;
    } else {
      const fmRes = await client.query(
        `INSERT INTO modules (course_id, title, order_index)
         VALUES ($1, 'Módulo 1: Introducción a Excel', 1) RETURNING id`,
        [freeCourseId]
      );
      freeModuleId = fmRes.rows[0].id;
      console.log(`   ✅  Módulo gratuito creado`);
    }

    const freeLessonTitles = [
      '01. Interfaz y conceptos básicos de Excel',
      '02. Fórmulas y funciones fundamentales',
    ];
    const freeLessonIds: number[] = [];
    for (let i = 0; i < freeLessonTitles.length; i++) {
      const existingFL = await client.query(
        `SELECT id FROM lessons WHERE module_id = $1 AND order_index = $2`,
        [freeModuleId, i + 1]
      );
      if (existingFL.rowCount && existingFL.rowCount > 0) {
        freeLessonIds.push(existingFL.rows[0].id);
      } else {
        const flRes = await client.query(
          `INSERT INTO lessons (module_id, video_id, title, order_index, status)
           VALUES ($1, $2, $3, $4, 'published') RETURNING id`,
          [freeModuleId, approvedVideoId, freeLessonTitles[i], i + 1]
        );
        freeLessonIds.push(flRes.rows[0].id);
        console.log(`   ✅  Lección gratuita "${freeLessonTitles[i]}" creada`);
      }
    }

    // ─── 5. INSCRIPCIÓN ESTUDIANTE EN CURSO GRATUITO ──────────────────────
    console.log('\n🎓  Creando inscripción del estudiante en curso gratuito...');
    const estudianteId = userRows['estudiante'];
    let enrollmentFreeId: number;
    const existingEnroll = await client.query(
      `SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2`,
      [estudianteId, freeCourseId]
    );
    if (existingEnroll.rowCount && existingEnroll.rowCount > 0) {
      enrollmentFreeId = existingEnroll.rows[0].id;
      console.log(`   ↳  Inscripción gratuita ya existe (id=${enrollmentFreeId})`);
    } else {
      const enRes = await client.query(
        `INSERT INTO enrollments (user_id, course_id, order_id, enrolled_by, status)
         VALUES ($1, $2, NULL, $3, 'active') RETURNING id`,
        [estudianteId, freeCourseId, userRows['admin']]
      );
      enrollmentFreeId = enRes.rows[0].id;
      console.log(`   ✅  Inscripción gratuita creada (id=${enrollmentFreeId})`);
    }

    // Primera lección completada
    if (freeLessonIds.length > 0) {
      const existingLP = await client.query(
        `SELECT id FROM lesson_progress WHERE enrollment_id = $1 AND lesson_id = $2`,
        [enrollmentFreeId, freeLessonIds[0]]
      );
      if (!existingLP.rowCount || existingLP.rowCount === 0) {
        const totalBlocks = Math.ceil(DEMO_VIDEO_DURATION / 10);
        const completedBlocks = Math.ceil(totalBlocks * 0.9); // 90% visto
        const blocksArray = Array.from({ length: completedBlocks }, (_, i) => i);
        await client.query(
          `INSERT INTO lesson_progress (enrollment_id, lesson_id, watched_blocks, last_position_seconds, is_completed, completed_at)
           VALUES ($1, $2, $3, $4, true, now())`,
          [enrollmentFreeId, freeLessonIds[0], blocksArray, DEMO_VIDEO_DURATION]
        );
        console.log(`   ✅  Primera lección del curso gratuito marcada como completada`);
      } else {
        console.log(`   ↳  Progreso de primera lección ya existe`);
      }
    }

    // ─── 6. ORDEN PENDIENTE DEL ESTUDIANTE (curso de pago) ─────────────────
    console.log('\n💳  Creando orden pendiente del estudiante para curso de pago...');
    const existingOrder = await client.query(
      `SELECT id FROM orders WHERE user_id = $1 AND course_id = $2 AND status = 'pending'`,
      [estudianteId, paidCourseId]
    );
    if (existingOrder.rowCount && existingOrder.rowCount > 0) {
      console.log(`   ↳  Orden pendiente ya existe (id=${existingOrder.rows[0].id})`);
    } else {
      const oRes = await client.query(
        `INSERT INTO orders (user_id, course_id, amount, currency, status)
         VALUES ($1, $2, '350.00', 'BOB', 'pending') RETURNING id`,
        [estudianteId, paidCourseId]
      );
      console.log(`   ✅  Orden pendiente creada (id=${oRes.rows[0].id})`);
    }

    console.log('\n🎉  Seed completado con éxito.\n');
    console.log('─────────────────────────────────────────────');
    console.log('📋  RESUMEN DE DATOS:');
    console.log(`   Curso de pago: "Auditoría Interna Básica" (id=${paidCourseId}) — 350 BOB`);
    console.log(`   Curso gratuito: "Excel Empresarial Básico" (id=${freeCourseId})`);
    console.log(`   Video aprobado (id=${approvedVideoId}): YouTube ${DEMO_VIDEO_ID} (${DEMO_VIDEO_DURATION}s)`);
    console.log(`   Video pendiente (id=${pendingVideoId}): YouTube ${PENDING_VIDEO_ID}`);
    console.log(`   Estudiante inscrito en curso gratuito, 1ra lección completada`);
    console.log(`   Orden pendiente de estudiante@demo.com para curso de pago`);
    console.log('─────────────────────────────────────────────\n');

  } catch (err) {
    console.error('❌  Error en seed:', err);
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
