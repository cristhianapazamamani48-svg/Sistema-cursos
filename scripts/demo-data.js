// scripts/demo-data.js
// SCRIPT DE DATOS DE DEMOSTRACIÓN (SOLO PARA DESARROLLO / PRUEBAS)
// NUNCA DEBE EJECUTARSE EN PRODUCCIÓN SIN VARIABLE EXPLÍCITA

const { Client } = require('pg');
const bcrypt = require('bcrypt');

// Bloqueo estricto para entorno de producción
if (process.env.NODE_ENV === 'production' && !process.env.FORCE_DEMO_DATA) {
  console.error('⛔ ERROR: Este script de datos de demostración está bloqueado en entorno de producción.');
  console.error('   Si realmente deseas ejecutarlo en desarrollo/staging, define FORCE_DEMO_DATA=true');
  process.exit(1);
}

async function runDemoData() {
  const url =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5433}/${process.env.DB_NAME || 'plataforma_cursos'}`;

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    console.log('🚀 [demo-data] Iniciando carga de datos de demostración de Negocios...');
    await client.query('BEGIN');

    const defaultPasswordHash = await bcrypt.hash('12345678', 10);

    // =========================================================================
    // 1. USUARIOS: 2 DOCENTES Y 5 ESTUDIANTES (+ ADMIN VERIFICADO)
    // =========================================================================
    const usersData = [
      {
        email: 'administrador@gmail.com',
        fullName: 'Administrador Demo',
        role: 'admin',
        bio: 'Superintendente y Gestor de Contenidos Académicos.',
        phone: '+591 70011223',
      },
      {
        email: 'carlos.mendoza@negocios.com',
        fullName: 'MSc. Carlos Mendoza',
        role: 'docente',
        bio: 'Consultor Internacional en Estrategia Empresarial y Finanzas Corporativas con más de 15 años de trayectoria.',
        phone: '+591 71098765',
      },
      {
        email: 'patricia.silva@negocios.com',
        fullName: 'Lic. Patricia Silva',
        role: 'docente',
        bio: 'Especialista en Marketing Estratégico B2B, Negociación de Alto Impacto y Formación Ejecutiva.',
        phone: '+591 72034567',
      },
      {
        email: 'alejandro.quispe@demo.com',
        fullName: 'Alejandro Quispe Mamani',
        role: 'estudiante',
        bio: 'Emprendedor enfocado en transformación digital y nuevos modelos de negocio.',
        phone: '+591 75012345',
      },
      {
        email: 'mariana.flores@demo.com',
        fullName: 'Mariana Flores Rojas',
        role: 'estudiante',
        bio: 'Analista de inversión y apasionada por las finanzas corporativas.',
        phone: '+591 76023456',
      },
      {
        email: 'rodrigo.morales@demo.com',
        fullName: 'Rodrigo Morales Vaca',
        role: 'estudiante',
        bio: 'Líder comercial y consultor de ventas estratégicas B2B.',
        phone: '+591 77034567',
      },
      {
        email: 'valeria.benitez@demo.com',
        fullName: 'Valeria Benítez Cuéllar',
        role: 'estudiante',
        bio: 'Estudiante de Administración con interés en liderazgo y negociación.',
        phone: '+591 78045678',
      },
      {
        email: 'fernando.torrez@demo.com',
        fullName: 'Fernando Tórrez Alarcón',
        role: 'estudiante',
        bio: 'Gerente de operaciones y especialista en gestión por procesos.',
        phone: '+591 79056789',
      },
    ];

    const userIds = {};

    for (const u of usersData) {
      const res = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_active, bio, phone, email_verified_at)
         VALUES ($1, $2, $3, $4, true, $5, $6, now())
         ON CONFLICT (email) DO UPDATE
         SET full_name = EXCLUDED.full_name,
             role = EXCLUDED.role,
             bio = EXCLUDED.bio,
             phone = EXCLUDED.phone,
             is_active = true
         RETURNING id;`,
        [u.email, defaultPasswordHash, u.fullName, u.role, u.bio, u.phone],
      );
      userIds[u.email] = res.rows[0].id;
    }

    const docCarlosId = userIds['carlos.mendoza@negocios.com'];
    const docPatriciaId = userIds['patricia.silva@negocios.com'];
    const est1Id = userIds['alejandro.quispe@demo.com'];
    const est2Id = userIds['mariana.flores@demo.com'];
    const est3Id = userIds['rodrigo.morales@demo.com'];
    const est4Id = userIds['valeria.benitez@demo.com'];
    const est5Id = userIds['fernando.torrez@demo.com'];

    // =========================================================================
    // 2. VIDEOS BASE APROBADOS DE YOUTUBE (TEMAS EMPRESARIALES)
    // =========================================================================
    const youtubeVideos = [
      { ref: 'dQw4w9WgXcQ', title: 'Fundamentos de la Estrategia Empresarial', duration: 213 },
      { ref: 'jNQXAC9IVRw', title: 'Modelos de Negocio Disruptivos y Canvas', duration: 180 },
      { ref: '2lAe1cqCOXo', title: 'Planificación Financiera y Flujo de Caja', duration: 240 },
      { ref: 'L_LUpnjgPso', title: 'Estrategias de Crecimiento y Marketing B2B', duration: 300 },
      { ref: 'fJ9rUzIMcZQ', title: 'Liderazgo Transformacional y Equipos de Alto Rendimiento', duration: 260 },
    ];

    const videoIds = {};
    for (const v of youtubeVideos) {
      const vRes = await client.query(
        `INSERT INTO videos (title, provider, provider_ref, duration_seconds, uploaded_by, status)
         VALUES ($1, 'youtube', $2, $3, $4, 'approved')
         ON CONFLICT DO NOTHING
         RETURNING id;`,
        [v.title, v.ref, v.duration, docCarlosId],
      );
      if (vRes.rowCount > 0) {
        videoIds[v.ref] = vRes.rows[0].id;
      } else {
        const exist = await client.query(
          `SELECT id FROM videos WHERE provider = 'youtube' AND provider_ref = $1 LIMIT 1;`,
          [v.ref],
        );
        videoIds[v.ref] = exist.rows[0]?.id;
      }
    }

    // =========================================================================
    // 3. 4 CURSOS REALISTAS DE NEGOCIOS (1 GRATIS, 3 DE PAGO EN BS.)
    // =========================================================================
    const coursesData = [
      {
        slug: 'gestion-estrategica-modelos-negocio',
        title: 'Gestión Estratégica y Modelos de Negocio',
        description: 'Domina los principios esenciales de la estrategia corporativa, diseño de modelos Canvas y análisis competitivo para escalar empresas sostenibles.',
        price: '0.00',
        currency: 'BOB',
        docenteId: docCarlosId,
        minWatch: 80,
        thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
        modules: [
          {
            title: 'Módulo 1: Fundamentos de la Estrategia Empresarial',
            description: 'Conceptos clave, visión, misión y posicionamiento de mercado.',
            lessons: [
              { title: '1.1 Introducción a la Ventaja Competitiva', ref: 'dQw4w9WgXcQ' },
              { title: '1.2 Análisis del Entorno: PESTEL y 5 Fuerzas de Porter', ref: 'jNQXAC9IVRw' },
              { title: '1.3 Matriz FODA Cruzada y Formulación de Objetivos', ref: '2lAe1cqCOXo' },
            ],
          },
          {
            title: 'Módulo 2: Arquitectura del Modelo de Negocio',
            description: 'Estructuración sistemática con la metodología Business Model Canvas.',
            lessons: [
              { title: '2.1 Propuesta de Valor y Segmentos de Clientes', ref: 'L_LUpnjgPso' },
              { title: '2.2 Canales de Distribución y Relación con el Cliente', ref: 'fJ9rUzIMcZQ' },
              { title: '2.3 Fuentes de Ingresos y Estructura de Costos', ref: 'dQw4w9WgXcQ' },
            ],
          },
          {
            title: 'Módulo 3: Ejecución y Control Estratégico',
            description: 'Implementación mediante OKRs y tableros de control.',
            lessons: [
              { title: '3.1 Definición y Despliegue de OKRs', ref: 'jNQXAC9IVRw' },
              { title: '3.2 Indicadores Clave de Desempeño (KPIs)', ref: '2lAe1cqCOXo' },
              { title: '3.3 Gestión del Cambio y Cultura de Ejecución', ref: 'L_LUpnjgPso' },
            ],
          },
        ],
      },
      {
        slug: 'finanzas-corporativas-analisis-inversiones',
        title: 'Finanzas Corporativas y Análisis de Inversiones',
        description: 'Aprende a interpretar estados financieros, valorar proyectos mediante VAN/TIR y estructurar presupuestos de capital con criterio ejecutivo.',
        price: '250.00',
        currency: 'BOB',
        docenteId: docCarlosId,
        minWatch: 85,
        thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80',
        modules: [
          {
            title: 'Módulo 1: Diagnóstico y Estados Financieros',
            description: 'Balance General, Estado de Resultados y Ratios Financieros.',
            lessons: [
              { title: '1.1 Estructura del Balance y Capital de Trabajo', ref: '2lAe1cqCOXo' },
              { title: '1.2 Análisis de Rentabilidad (ROA, ROE, EBITDA)', ref: 'dQw4w9WgXcQ' },
              { title: '1.3 Flujo de Caja Operativo vs Contabilidad de Devengo', ref: 'jNQXAC9IVRw' },
            ],
          },
          {
            title: 'Módulo 2: Matemáticas Financieras y Criterios de Inversión',
            description: 'Valor del dinero en el tiempo, descuento de flujos y riesgo.',
            lessons: [
              { title: '2.1 Valor Presente Neto (VAN) y Tasa Interna de Retorno (TIR)', ref: 'L_LUpnjgPso' },
              { title: '2.2 Costo Promedio Ponderado de Capital (WACC)', ref: 'fJ9rUzIMcZQ' },
              { title: '2.3 Período de Recuperación y Sensibilidad de Proyectos', ref: '2lAe1cqCOXo' },
            ],
          },
          {
            title: 'Módulo 3: Decisiones de Financiamiento y Estructura de Deuda',
            description: 'Apalancamiento, deuda bancaria y emisión de deuda corporativa.',
            lessons: [
              { title: '3.1 Financiamiento Propio vs Deuda Bancaria', ref: 'dQw4w9WgXcQ' },
              { title: '3.2 Gestión del Riesgo Financiero y Liquidez', ref: 'jNQXAC9IVRw' },
              { title: '3.3 Presentación del Caso Práctico Integral', ref: 'L_LUpnjgPso' },
            ],
          },
        ],
      },
      {
        slug: 'marketing-digital-ventas-b2b',
        title: 'Marketing Digital y Crecimiento de Ventas B2B',
        description: 'Construye embudos de prospección eficientes, generación de demanda en LinkedIn y cierre de ventas consultivas complejas.',
        price: '180.00',
        currency: 'BOB',
        docenteId: docPatriciaId,
        minWatch: 80,
        thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
        modules: [
          {
            title: 'Módulo 1: Arquitectura del Embudo de Ventas B2B',
            description: 'Buyer Persona corporativo y mapeo del viaje de compra.',
            lessons: [
              { title: '1.1 Diferencias clave entre B2C y B2B', ref: 'L_LUpnjgPso' },
              { title: '1.2 Identificación de Cuentas Clave (ABM)', ref: 'fJ9rUzIMcZQ' },
              { title: '1.3 Definición de Ofertas de Valor para tomadores de decisión', ref: 'dQw4w9WgXcQ' },
            ],
          },
          {
            title: 'Módulo 2: Generación de Demanda y Prospección Digital',
            description: 'Social Selling en LinkedIn, cold email y automatizaciones.',
            lessons: [
              { title: '2.1 Estrategia de Contenidos para Autoridad Profesional', ref: 'jNQXAC9IVRw' },
              { title: '2.2 Campañas segmentadas y captación de leads MQL', ref: '2lAe1cqCOXo' },
              { title: '2.3 Nutrición de Prospectos y Lead Scoring', ref: 'L_LUpnjgPso' },
            ],
          },
          {
            title: 'Módulo 3: Cierre de Ventas y Retención de Clientes',
            description: 'Venta consultiva, manejo de objeciones y expansión (Upselling).',
            lessons: [
              { title: '3.1 Diagnóstico de necesidades corporativas', ref: 'fJ9rUzIMcZQ' },
              { title: '3.2 Negociación de contratos y términos de servicio', ref: 'dQw4w9WgXcQ' },
              { title: '3.3 Fidelización y Customer Success Management', ref: 'jNQXAC9IVRw' },
            ],
          },
        ],
      },
      {
        slug: 'liderazgo-ejecutivo-negociacion',
        title: 'Liderazgo Ejecutivo y Negociación de Alto Impacto',
        description: 'Desarrolla habilidades de persuasión, resolución estratégica de conflictos y liderazgo situacional para equipos interdisciplinarios.',
        price: '320.00',
        currency: 'BOB',
        docenteId: docPatriciaId,
        minWatch: 85,
        thumbnail: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
        modules: [
          {
            title: 'Módulo 1: Liderazgo Estratégico y Comunicación',
            description: 'Estilos de liderazgo, inteligencia emocional y oratoria corporativa.',
            lessons: [
              { title: '1.1 Autoconocimiento y Liderazgo Resonante', ref: 'fJ9rUzIMcZQ' },
              { title: '1.2 Comunicación Asertiva y Feedback Constructivo', ref: 'dQw4w9WgXcQ' },
              { title: '1.3 Delegación Efectiva y Empoderamiento de Equipos', ref: 'jNQXAC9IVRw' },
            ],
          },
          {
            title: 'Módulo 2: Metodología de Negociación de Harvard',
            description: 'Intereses vs Posiciones, generación de opciones y criterios objetivos.',
            lessons: [
              { title: '2.1 Los 7 Elementos del Método Harvard', ref: '2lAe1cqCOXo' },
              { title: '2.2 Cómo Identificar el MAPAN / BATNA', ref: 'L_LUpnjgPso' },
              { title: '2.3 Negociación Basada en Principios', ref: 'fJ9rUzIMcZQ' },
            ],
          },
          {
            title: 'Módulo 3: Gestión de Conflictos y Acuerdos de Alto Nivel',
            description: 'Manejo de situaciones de crisis y pactos duraderos.',
            lessons: [
              { title: '3.1 Tácticas frente a interlocutores difíciles', ref: 'dQw4w9WgXcQ' },
              { title: '3.2 Mediación y Construcción de Consensos', ref: 'jNQXAC9IVRw' },
              { title: '3.3 Cierre de Acuerdos y Seguimiento Posnegociación', ref: '2lAe1cqCOXo' },
            ],
          },
        ],
      },
    ];

    const courseMap = {};

    for (const cData of coursesData) {
      const cRes = await client.query(
        `INSERT INTO courses (title, slug, description, price, currency, status, min_watch_percentage, thumbnail_url, created_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'published', $6, $7, $8, now())
         ON CONFLICT (slug) DO UPDATE
         SET title = EXCLUDED.title,
             description = EXCLUDED.description,
             price = EXCLUDED.price,
             currency = EXCLUDED.currency,
             status = 'published',
             min_watch_percentage = EXCLUDED.min_watch_percentage,
             thumbnail_url = EXCLUDED.thumbnail_url,
             updated_at = now()
         RETURNING id;`,
        [cData.title, cData.slug, cData.description, cData.price, cData.currency, cData.minWatch, cData.thumbnail, cData.docenteId],
      );
      const courseId = cRes.rows[0].id;

      await client.query(
        `INSERT INTO course_docentes (course_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING;`,
        [courseId, cData.docenteId],
      );

      courseMap[cData.slug] = { id: courseId, modules: [] };

      for (let mIdx = 0; mIdx < cData.modules.length; mIdx++) {
        const mData = cData.modules[mIdx];
        const mRes = await client.query(
          `INSERT INTO modules (course_id, title, description, order_index)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING
           RETURNING id;`,
          [courseId, mData.title, mData.description, mIdx + 1],
        );

        let moduleId;
        if (mRes.rowCount > 0) {
          moduleId = mRes.rows[0].id;
        } else {
          const modExist = await client.query(
            `SELECT id FROM modules WHERE course_id = $1 AND title = $2 LIMIT 1;`,
            [courseId, mData.title],
          );
          moduleId = modExist.rows[0].id;
        }

        const moduleObj = { id: moduleId, lessons: [] };

        for (let lIdx = 0; lIdx < mData.lessons.length; lIdx++) {
          const lData = mData.lessons[lIdx];
          const vId = videoIds[lData.ref] || null;

          const lRes = await client.query(
            `INSERT INTO lessons (module_id, title, description, order_index, status, video_id, study_material_url, study_material_content)
             VALUES ($1, $2, $3, $4, 'published', $5, $6, $7)
             ON CONFLICT DO NOTHING
             RETURNING id;`,
            [
              moduleId,
              lData.title,
              `Contenido pedagógico detallado para: ${lData.title}`,
              lIdx + 1,
              vId,
              `https://www.youtube.com/watch?v=${lData.ref}`,
              `En esta unidad académica analizaremos conceptos fundamentales aplicados a situaciones reales de mercado con estudio de casos y herramientas prácticas.`,
            ],
          );

          let lessonId;
          if (lRes.rowCount > 0) {
            lessonId = lRes.rows[0].id;
          } else {
            const lesExist = await client.query(
              `SELECT id FROM lessons WHERE module_id = $1 AND title = $2 LIMIT 1;`,
              [moduleId, lData.title],
            );
            lessonId = lesExist.rows[0].id;
          }

          moduleObj.lessons.push({ id: lessonId, title: lData.title });
        }

        courseMap[cData.slug].modules.push(moduleObj);
      }
      console.log(`[demo-data] Curso listo: ${cData.title} (#${courseId}, 3 módulos, 9 lecciones)`);
    }

    const c1 = courseMap['gestion-estrategica-modelos-negocio'];
    const c2 = courseMap['finanzas-corporativas-analisis-inversiones'];
    const c3 = courseMap['marketing-digital-ventas-b2b'];
    const c4 = courseMap['liderazgo-ejecutivo-negociacion'];

    // =========================================================================
    // 4. INSCRIPCIONES Y PROGRESO VARIADO (100%, 40%, 0%)
    // =========================================================================
    async function setupEnrollment(userId, courseId, status, progressRatio) {
      const enrRes = await client.query(
        `INSERT INTO enrollments (user_id, course_id, status, enrolled_at, completed_at)
         VALUES ($1, $2, $3, now() - interval '7 days', $4)
         ON CONFLICT DO NOTHING
         RETURNING id;`,
        [userId, courseId, status, status === 'completed' ? new Date() : null],
      );

      let enrollmentId;
      if (enrRes.rowCount > 0) {
        enrollmentId = enrRes.rows[0].id;
      } else {
        const exist = await client.query(
          `SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 LIMIT 1;`,
          [userId, courseId],
        );
        enrollmentId = exist.rows[0].id;
        await client.query(
          `UPDATE enrollments SET status = $1, completed_at = $2 WHERE id = $3;`,
          [status, status === 'completed' ? new Date() : null, enrollmentId],
        );
      }

      const lesRes = await client.query(
        `SELECT l.id FROM lessons l
         JOIN modules m ON m.id = l.module_id
         WHERE m.course_id = $1 AND l.status = 'published' AND l.deleted_at IS NULL
         ORDER BY m.order_index ASC, l.order_index ASC;`,
        [courseId],
      );

      const allLessons = lesRes.rows;
      const countToComplete = Math.round(allLessons.length * progressRatio);

      for (let i = 0; i < allLessons.length; i++) {
        const lId = allLessons[i].id;
        const isComp = i < countToComplete;

        await client.query(
          `INSERT INTO lesson_progress (enrollment_id, lesson_id, watched_blocks, last_position_seconds, is_completed, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING;`,
          [
            enrollmentId,
            lId,
            isComp ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] : [0, 1],
            isComp ? 200 : 20,
            isComp,
            isComp ? new Date() : null,
          ],
        );
      }

      return enrollmentId;
    }

    const enr1Id = await setupEnrollment(est1Id, c1.id, 'completed', 1.0);
    const enr2Id = await setupEnrollment(est2Id, c2.id, 'completed', 1.0);
    const enr3Id = await setupEnrollment(est3Id, c3.id, 'active', 0.4);
    const enr4Id = await setupEnrollment(est4Id, c1.id, 'active', 0.0);
    const enr5Id = await setupEnrollment(est5Id, c2.id, 'active', 0.4);

    console.log('[demo-data] Inscripciones y progresos configurados (100%, 40%, 0%).');

    // =========================================================================
    // 5. 2 CERTIFICADOS EMITIDOS OFICIALMENTE
    // =========================================================================
    const certsData = [
      {
        code: 'EDU-STRAT-2026-001',
        enrollmentId: enr1Id,
        userId: est1Id,
        courseId: c1.id,
        studentName: 'Alejandro Quispe Mamani',
        courseTitle: 'Gestión Estratégica y Modelos de Negocio',
        workload: 40,
      },
      {
        code: 'EDU-FIN-2026-002',
        enrollmentId: enr2Id,
        userId: est2Id,
        courseId: c2.id,
        studentName: 'Mariana Flores Rojas',
        courseTitle: 'Finanzas Corporativas y Análisis de Inversiones',
        workload: 60,
      },
    ];

    for (const cert of certsData) {
      await client.query(
        `INSERT INTO certificates (code, enrollment_id, user_id, course_id, student_name, course_title, workload_hours, issued_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now() - interval '2 days')
         ON CONFLICT (code) DO NOTHING;`,
        [cert.code, cert.enrollmentId, cert.userId, cert.courseId, cert.studentName, cert.courseTitle, cert.workload],
      );
    }
    console.log('[demo-data] 2 Certificados emitidos con códigos: EDU-STRAT-2026-001 y EDU-FIN-2026-002.');

    // =========================================================================
    // 6. 3 PAGOS PENDIENTES CON COMPROBANTE BANCARIO REALISTA
    // =========================================================================
    const pendingOrdersData = [
      {
        userId: est5Id,
        courseId: c3.id,
        amount: '180.00',
        currency: 'BOB',
        receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
        notes: 'Transferencia Bancaria BCP - Depósito Ref: #8849201 por Fernando Tórrez',
      },
      {
        userId: est4Id,
        courseId: c4.id,
        amount: '320.00',
        currency: 'BOB',
        receiptUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=800&q=80',
        notes: 'Transferencia QR BNB - Comprobante de pago enviado por Valeria Benítez',
      },
      {
        userId: est1Id,
        courseId: c2.id,
        amount: '250.00',
        currency: 'BOB',
        receiptUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
        notes: 'Pago en Ventanilla Banco Mercantil Santa Cruz - Alejandro Quispe',
      },
    ];

    for (const ord of pendingOrdersData) {
      const oRes = await client.query(
        `INSERT INTO orders (user_id, course_id, amount, currency, status, receipt_url, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'pending', $5, $6, now() - interval '1 hour', now())
         RETURNING id;`,
        [ord.userId, ord.courseId, ord.amount, ord.currency, ord.receiptUrl, ord.notes],
      );
      console.log(`[demo-data] Orden pendiente creada: #${oRes.rows[0].id} (${ord.amount} ${ord.currency})`);
    }

    // =========================================================================
    // 7. CALIFICACIONES Y NOTAS (ACTIVIDADES Y EVALUACIONES)
    // =========================================================================
    const firstLessonC1 = c1.modules[0].lessons[0].id;
    const firstLessonC2 = c2.modules[0].lessons[0].id;

    const actRes1 = await client.query(
      `INSERT INTO unit_activities (lesson_id, title, description, instructions)
       VALUES ($1, 'Caso Práctico: Matriz de Ventaja Competitiva', 'Analiza una empresa boliviana aplicando el marco de Porter.', 'Describe la propuesta de valor y las 5 fuerzas de mercado.')
       RETURNING id;`,
      [firstLessonC1],
    );
    const act1Id = actRes1.rows[0].id;

    await client.query(
      `INSERT INTO activity_submissions (activity_id, user_id, content, grade, feedback, status)
       VALUES ($1, $2, 'Adjunto informe de análisis sobre la empresa Sofía Ltda y sus barreras de entrada.', 95.00, 'Excelente trabajo de investigación y fundamentación estratégica.', 'graded')
       ON CONFLICT DO NOTHING;`,
      [act1Id, est1Id],
    );

    const qzRes = await client.query(
      `INSERT INTO quizzes (lesson_id, title, description, passing_score, max_attempts)
       VALUES ($1, 'Evaluación Inicial: Diagnóstico Financiero', 'Test de comprensión de conceptos clave de balance y liquidez.', 70, 3)
       ON CONFLICT (lesson_id) DO UPDATE SET title = EXCLUDED.title
       RETURNING id;`,
      [firstLessonC2],
    );
    const qzId = qzRes.rows[0].id;

    await client.query(
      `INSERT INTO quiz_attempts (quiz_id, user_id, score, passed, answers, attempt_number)
       VALUES ($1, $2, 100.00, true, '{"1": 1, "2": 2}', 1)
       ON CONFLICT DO NOTHING;`,
      [qzId, est2Id],
    );

    console.log('[demo-data] Actividades, evaluaciones y calificaciones añadidas.');

    await client.query('COMMIT');
    console.log('\n✅ [demo-data] ¡Carga completada con éxito sin duplicados!');

    // =========================================================================
    // LISTA RESUMEN DE CUENTAS DE ACCESO
    // =========================================================================
    console.log('\n=========================================================================');
    console.log('               CUENTAS DE ACCESO DE DEMOSTRACIÓN (NEGOCIOS)              ');
    console.log('=========================================================================');
    console.log('Contraseña general para todos los usuarios: 12345678\n');
    console.log('👑 ADMINISTRADOR:');
    console.log('  • administrador@gmail.com        | Rol: admin');
    console.log('\n👨‍🏫 DOCENTES:');
    console.log('  • carlos.mendoza@negocios.com    | Rol: docente  (Estrategia & Finanzas)');
    console.log('  • patricia.silva@negocios.com    | Rol: docente  (Marketing B2B & Liderazgo)');
    console.log('\n🎓 ESTUDIANTES:');
    console.log('  • alejandro.quispe@demo.com      | 100% Estrategia | Certificado: EDU-STRAT-2026-001 | Nota: 95/100');
    console.log('  • mariana.flores@demo.com        | 100% Finanzas   | Certificado: EDU-FIN-2026-002   | Nota: 100/100');
    console.log('  • rodrigo.morales@demo.com       | 40% Marketing B2B | Inscripción Activa');
    console.log('  • valeria.benitez@demo.com       | 0% Estrategia    | Pago Pendiente (Liderazgo)');
    console.log('  • fernando.torrez@demo.com       | 40% Finanzas     | Pago Pendiente (Marketing B2B)');
    console.log('\n💳 PAGOS PENDIENTES EN ADMIN:');
    console.log('  • 3 órdenes con comprobantes de transferencia listos para aprobar en /admin -> Pagos');
    console.log('=========================================================================\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [demo-data] Error durante la ejecución:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runDemoData();
