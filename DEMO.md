# Guión de Presentación y Demo para Cliente — AulaPro

Este documento contiene el guión detallado paso a paso para la demostración en vivo de la plataforma **AulaPro (Sistema de Cursos)** ante el cliente.

---

## 1. Puesta en Marcha Rápida

### Requisitos Previos
- Docker Desktop en ejecución.
- Node.js 20+ instalado.

### Comandos de Inicio

1. **Levantar Base de Datos PostgreSQL 16**:
   ```powershell
   # En la raíz del proyecto
   docker compose up -d
   ```
   *(Verificar que el contenedor `plataforma-cursos-postgres` esté corriendo en el puerto 5433).*

2. **Iniciar Backend (NestJS 11 + Drizzle)**:
   ```powershell
   cd backend
   npm run start:dev
   ```
   *El backend estará disponible en `http://localhost:3000`.*

3. **Iniciar Frontend (React 19 + Vite 8 + Tailwind 4)**:
   ```powershell
   cd frontend
   npm run dev
   ```
   *El frontend estará disponible en `http://localhost:5173`.*

---

## 2. Reinicio de Datos de Demostración

Para reiniciar la base de datos a su estado inicial limpio antes de comenzar o entre ensayos:

```powershell
cd backend
npm run seed -- --reset
```

> **Nota:** El seed es idempotente. Crea las cuentas de demostración, el curso gratuito con una lección completada, el curso de pago con una orden pendiente, y los videos moderados.

---

## 3. Credenciales de Demostración

| Rol | Correo Electrónico | Contraseña | Propósito en la Demo |
| :--- | :--- | :--- | :--- |
| **Estudiante** | `estudiante@demo.com` | `Estudiante2024!` | Demostrar flujo de aprendizaje, tracking y compra |
| **Administrador** | `admin@demo.com` | `Admin2024!` | Confirmar pagos manuales y moderar videos |
| **Docente** | `docente@demo.com` | `Docente2024!` | Subida de contenidos y visualización pedagógica |
| **Superadmin** | `superadmin@demo.com` | `SuperAdmin2024!` | Control global y auditoría |

*(En la pantalla de inicio de sesión de la aplicación, existen botones de acceso rápido para rellenar automáticamente estas credenciales sin necesidad de digitarlas).*

---

## 4. Guión de la Presentación Paso a Paso

### ⏱️ Fase 1: Introducción y Catálogo Público (2 minutos)
1. Abrir `http://localhost:5173` en el navegador (sin sesión iniciada).
2. **Explicar la propuesta de valor**:
   - Plataforma de capacitación institucional moderna, rápida y segura.
   - Todo el contenido y las interfaces en español.
3. **Mostrar el Catálogo de Cursos**:
   - Tarjeta 1: **"Excel Empresarial Básico"** (Badge verde: *GRATIS*, requisito mínimo 85%).
   - Tarjeta 2: **"Auditoría Interna Básica"** (Badge azul: *350 BOB*, requisito mínimo 85%).
4. **Demostrar Seguridad de Contenido**:
   - Hacer clic en **"Ver Temario"** en el curso de pago.
   - Mostrar cómo los módulos y títulos de lecciones son visibles para motivar la inscripción, pero **las referencias a los videos (YouTube ID) jamás se exponen en la API pública**.

---

### ⏱️ Fase 2: Experiencia del Estudiante y Aula Virtual (5 minutos)
1. Hacer clic en **"Iniciar Sesión"** en la barra superior.
2. Usar el botón de acceso rápido **"Estudiante"** (`estudiante@demo.com`) e ingresar.
3. Ir a la pestaña **"Mis Cursos"**:
   - Mostrar la tarjeta de *Excel Empresarial Básico* con barra de progreso activa (50% completado, 1 de 2 lecciones aprobadas).
4. Hacer clic en **"Continuar Aprendiendo"** para entrar al **Aula Virtual**:
   - **Bloqueo Secuencial**:
     - El Módulo 1 está desbloqueado.
     - La Lección 1 muestra el checkmark verde de lección aprobada (100% visto).
   - **Reproductor y Tracking Anti-Trampa en Vivo**:
     - Seleccionar la Lección 2.
     - Darle Play al reproductor de YouTube integrado.
     - Mostrar el pulso verde de **"Tracking Activo"** e indicar que el sistema envía latidos al servidor cada 5.5 segundos registrando bloques de 10 segundos.
     - Explicar la regla anti-trampa: un usuario no puede adelantar el video al final para aprobar; debe ver al menos el 85% de los bloques reales del contenido.
   - **Certificación**:
     - Mostrar el estado del curso y el botón *"Solicitar Certificado"*, que permanece inactivo hasta completar todos los requisitos académicos.

---

### ⏱️ Fase 3: Proceso de Compra y Orden Pendiente (3 minutos)
1. Volver al **Catálogo** como estudiante y seleccionar el curso de pago **"Auditoría Interna Básica" (350 BOB)**.
2. Hacer clic en **"Ver Temario"**.
3. Notar el aviso destacado:
   > *"⚠️ Tienes una orden pendiente de confirmación (#3) por 350 BOB"*.
4. Explicar al cliente:
   - *"El webhook automático de pasarela se encuentra actualmente desactivado a la espera de la firma HMAC y contratación del proveedor de pagos del cliente. Por tanto, el flujo opera de forma robusta con confirmación manual por comprobante desde el panel administrativo."*

---

### ⏱️ Fase 4: Panel Administrativo y Validación (3 minutos)
1. Cerrar sesión y presionar **"Iniciar Sesión"**.
2. Usar el botón de acceso rápido **"Administrador"** (`admin@demo.com`) e ingresar.
3. En la barra superior, ingresar a la pestaña **"Panel Admin"**:
   - **Pestaña "Órdenes y Pagos"**:
     - Localizar la Orden #3 de `estudiante@demo.com` para *Auditoría Interna Básica*.
     - Presionar el botón **"Validar Pago"**.
     - Se emite la confirmación manual y el backend activa automáticamente la inscripción del estudiante (`enrollments`).
   - **Pestaña "Aprobación de Videos"**:
     - Mostrar el video pendiente de YouTube (`jNQXAC9IVRw`).
     - Explicar la regla de auditoría docente: ningún video puede publicarse en lecciones de estudiantes sin el visto bueno previo del administrador.
     - Presionar **"Aprobar Video"** y observar cómo el estado cambia a *Aprobado*.

---

### ⏱️ Fase 5: Cierre y Comprobación de Acceso (2 minutos)
1. Cerrar sesión como administrador e ingresar nuevamente como **Estudiante**.
2. Ir a **"Mis Cursos"**:
   - Notar que ahora **"Auditoría Interna Básica"** aparece activo entre los cursos del estudiante con su progreso en 0%.
3. Entrar al **Aula Virtual**:
   - Mostrar el primer módulo desbloqueado listo para iniciar.
   - Notar cómo el Módulo 2 tiene el icono de candado cerrado hasta que el estudiante complete las lecciones del Módulo 1.

---

## 5. Resumen de Seguridad y Arquitectura

- **CSRF Token**: Protegido en `SessionGuard` en todas las operaciones POST, PUT, PATCH y DELETE.
- **Seguridad en Videos**: El endpoint público `GET /api/courses/:slug` omite cualquier identificador de proveedor de video.
- **Protección de Lecciones**: `GET /api/lessons/:id` exige inscripción activa o rol de staff.
- **Rate-Limiting de Heartbeats**: Consulta atómica en PostgreSQL que rechaza latidos con menos de 5 segundos de separación o bloques fuera del rango de duración.
