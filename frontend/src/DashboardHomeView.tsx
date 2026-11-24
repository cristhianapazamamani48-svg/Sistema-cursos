import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Play,
  ArrowRight,
  Award,
  Users,
  CreditCard,
  FileText,
  AlertCircle,
  TrendingUp,
  Layers,
  Sparkles,
  Loader2,
  Calendar,
  ChevronRight,
  PlusCircle,
  DollarSign,
} from 'lucide-react';
import { api } from './api';

interface DashboardHomeViewProps {
  currentUser: {
    id: number;
    email: string;
    fullName: string;
    role: string;
  };
  onNavigate: (tab: string, subTab?: string) => void;
  onEnterCourse: (slug: string) => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export default function DashboardHomeView({
  currentUser,
  onNavigate,
  onEnterCourse,
  showToast,
}: DashboardHomeViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [currentUser.role]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api('/api/users/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        showToast('error', 'No se pudo cargar el panel de inicio');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error al consultar resumen');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 text-[#F2412C] animate-spin" />
        <p className="text-xs font-bold text-[#555861]">Cargando tu panel de inicio...</p>
      </div>
    );
  }

  const role = currentUser.role;

  // =========================================================================
  // 1. VISTA DE INICIO PARA ESTUDIANTE
  // =========================================================================
  if (role === 'estudiante' || role === 'student') {
    const resume = data?.resumeCourse;
    const courses = data?.courses || [];
    const pendingActivities = data?.pendingActivities || [];

    return (
      <div className="space-y-8 animate-fade-in pb-12">
        {/* Cabecera de Bienvenida */}
        <div className="bg-gradient-to-r from-[#2B2D33] via-[#363940] to-[#2B2D33] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-[#F2412C]/20 to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-xl space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#F2412C] text-white">
              <Sparkles className="w-3.5 h-3.5" /> Aula Virtual
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              ¡Hola de nuevo, {currentUser.fullName.split(' ')[0]}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-[#E4E6EA]/80 leading-relaxed">
              Continúa avanzando en tus cursos y completa tus actividades para obtener tus certificaciones oficiales.
            </p>
          </div>
        </div>

        {/* Tarjeta: "Continuar donde lo dejé" */}
        {resume ? (
          <div className="bg-white border border-[#D1D5DB] rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-wider text-[#F2412C] flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 fill-current" /> Continuar donde lo dejé
              </span>
              <span className="text-xs font-extrabold text-[#2B2D33] bg-[#F8F9FA] border border-[#E4E6EA] px-3 py-1 rounded-full">
                {resume.completedLessons} de {resume.totalLessons} lecciones completadas
              </span>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6">
              {resume.thumbnailUrl && (
                <div className="w-full md:w-56 h-36 rounded-2xl overflow-hidden shrink-0 border border-[#E4E6EA] relative group">
                  <img
                    src={resume.thumbnailUrl}
                    alt={resume.courseTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-[#F2412C] text-white flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 space-y-3 w-full">
                <div>
                  <h3 className="text-lg font-black text-[#2B2D33] leading-snug">
                    {resume.courseTitle}
                  </h3>
                  <p className="text-xs text-[#555861] mt-0.5">
                    {resume.progressPercentage === 100
                      ? '¡Has completado el 100% de este curso! Reclama tu certificado oficial.'
                      : 'Tienes lecciones pendientes por completar en esta unidad académica.'}
                  </p>
                </div>

                {/* Barra de progreso */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-[#555861]">
                    <span>Avance curricular</span>
                    <span className="text-[#F2412C] font-black">{resume.progressPercentage}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#E4E6EA] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#F2412C] to-[#ff6b55] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(resume.progressPercentage, 4)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => onEnterCourse(resume.courseSlug)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F2412C] hover:bg-[#d93520] text-white text-xs font-black rounded-xl shadow-md shadow-[#F2412C]/20 transition cursor-pointer"
                  >
                    <span>Entrar al Aula</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {resume.progressPercentage === 100 && (
                    <button
                      onClick={() => onNavigate('my-certificates')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>Ver Diploma</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#D1D5DB] rounded-3xl p-8 text-center space-y-3 shadow-xs">
            <BookOpen className="w-10 h-10 text-[#555861] mx-auto" />
            <h3 className="text-sm font-black text-[#2B2D33]">Aún no estás inscrito en ningún curso</h3>
            <p className="text-xs text-[#555861] max-w-sm mx-auto">
              Explora nuestro catálogo de cursos profesionales de negocios e inscríbete para empezar tu formación.
            </p>
            <button
              onClick={() => onNavigate('catalog')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F2412C] hover:bg-[#d93520] text-white text-xs font-black rounded-xl transition cursor-pointer shadow-xs"
            >
              <span>Ver Catálogo de Cursos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Columna Izquierda: Progreso de Cursos (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-[#2B2D33] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#F2412C]" /> Mis Cursos Inscritos
                </h2>
                <p className="text-xs text-[#555861]">Estado de tu avance formativo</p>
              </div>
              <button
                onClick={() => onNavigate('my-courses')}
                className="text-xs font-bold text-[#F2412C] hover:underline cursor-pointer flex items-center gap-1"
              >
                Ver todos ({courses.length}) <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {courses.length === 0 ? (
              <div className="bg-white border border-[#D1D5DB] rounded-3xl p-6 text-center text-xs text-[#555861]">
                No tienes cursos inscritos en este momento.
              </div>
            ) : (
              <div className="space-y-3">
                {courses.slice(0, 4).map((c: any) => (
                  <div
                    key={c.enrollmentId}
                    className="bg-white border border-[#D1D5DB] rounded-2xl p-4.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs hover:border-[#F2412C]/40 transition"
                  >
                    <div className="flex items-center gap-4 w-full sm:w-auto min-w-0">
                      {c.thumbnailUrl ? (
                        <img
                          src={c.thumbnailUrl}
                          alt={c.courseTitle}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[#E4E6EA]"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-[#555861] shrink-0">
                          <BookOpen className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-[#2B2D33] truncate">
                          {c.courseTitle}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              c.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {c.status === 'completed' ? 'Completado' : 'En progreso'}
                          </span>
                          <span className="text-[11px] text-[#555861]">
                            {c.completedLessons} de {c.totalLessons} lecciones
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-black text-[#2B2D33]">
                          {c.progressPercentage}%
                        </span>
                        <div className="w-24 h-2 bg-[#E4E6EA] rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              c.progressPercentage === 100 ? 'bg-emerald-500' : 'bg-[#F2412C]'
                            }`}
                            style={{ width: `${c.progressPercentage}%` }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => onEnterCourse(c.courseSlug)}
                        className="px-3.5 py-2 bg-[#2B2D33] hover:bg-[#1E2024] text-white text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Aula
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Columna Derecha: Próximas Actividades (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div>
              <h2 className="text-base font-black text-[#2B2D33] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#F2412C]" /> Próximas Actividades
              </h2>
              <p className="text-xs text-[#555861]">Tareas pendientes por entregar</p>
            </div>

            <div className="bg-white border border-[#D1D5DB] rounded-3xl p-5 shadow-xs space-y-3">
              {pendingActivities.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#555861] space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-bold text-[#2B2D33]">¡Estás al día!</p>
                  <p className="text-[11px]">No tienes actividades pendientes de entrega.</p>
                </div>
              ) : (
                pendingActivities.map((act: any) => (
                  <div
                    key={act.activityId}
                    className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#E4E6EA] space-y-1.5 hover:border-[#F2412C]/40 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-black text-[#2B2D33] line-clamp-1">
                        {act.activityTitle}
                      </h4>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded shrink-0">
                        Pendiente
                      </span>
                    </div>
                    <p className="text-[11px] text-[#555861] truncate">
                      Curso: {act.courseTitle}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-[#555861] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        {act.dueDate ? new Date(act.dueDate).toLocaleDateString('es-BO') : 'Sin fecha límite'}
                      </span>
                      <button
                        onClick={() => onEnterCourse(act.courseSlug)}
                        className="text-[10px] font-bold text-[#F2412C] hover:underline cursor-pointer"
                      >
                        Ir a la tarea →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. VISTA DE INICIO PARA DOCENTE
  // =========================================================================
  if (role === 'docente' || role === 'teacher') {
    const stats = data?.stats || { totalCourses: 0, publishedCourses: 0, draftCourses: 0, totalStudents: 0 };
    const pendingGrading = data?.pendingGrading || [];
    const teacherCourses = data?.courses || [];

    return (
      <div className="space-y-8 animate-fade-in pb-12">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#2B2D33]">
              Panel Docente: {currentUser.fullName}
            </h1>
            <p className="text-xs text-[#555861]">
              Supervisión de cursos creados, estudiantes activos y calificaciones pendientes
            </p>
          </div>
          <button
            onClick={() => onNavigate('create-course')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F2412C] hover:bg-[#d93520] text-white text-xs font-black rounded-xl shadow-md shadow-[#F2412C]/20 transition cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Crear Nuevo Curso</span>
          </button>
        </div>

        {/* 4 KPIs Clave */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#D1D5DB] rounded-3xl p-5 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-[#555861] uppercase tracking-wider">Cursos Creados</span>
            <p className="text-2xl sm:text-3xl font-black text-[#2B2D33]">{stats.totalCourses}</p>
            <p className="text-[10px] text-[#555861]">En tu catálogo académico</p>
          </div>

          <div className="bg-white border border-[#D1D5DB] rounded-3xl p-5 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Publicados</span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.publishedCourses}</p>
            <p className="text-[10px] text-[#555861]">Disponibles para venta</p>
          </div>

          <div className="bg-white border border-[#D1D5DB] rounded-3xl p-5 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Borradores</span>
            <p className="text-2xl sm:text-3xl font-black text-amber-600">{stats.draftCourses}</p>
            <p className="text-[10px] text-[#555861]">En edición o temario</p>
          </div>

          <div className="bg-white border border-[#D1D5DB] rounded-3xl p-5 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-[#F2412C] uppercase tracking-wider">Estudiantes</span>
            <p className="text-2xl sm:text-3xl font-black text-[#F2412C]">{stats.totalStudents}</p>
            <p className="text-[10px] text-[#555861]">Inscritos en tus cursos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Entregas por Calificar (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-[#2B2D33] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#F2412C]" /> Entregas por Calificar
                </h2>
                <p className="text-xs text-[#555861]">Tareas prácticas recibidas de estudiantes</p>
              </div>
              <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
                {pendingGrading.length} pendientes
              </span>
            </div>

            <div className="bg-white border border-[#D1D5DB] rounded-3xl p-5 shadow-xs space-y-3">
              {pendingGrading.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#555861] space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-bold text-[#2B2D33]">¡Estás al día!</p>
                  <p className="text-[11px]">No hay entregas pendientes de revisión en tus cursos.</p>
                </div>
              ) : (
                pendingGrading.map((item: any) => (
                  <div
                    key={item.submissionId}
                    className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#E4E6EA] flex items-center justify-between gap-3 hover:border-[#F2412C]/40 transition"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#2B2D33] truncate">
                          {item.studentName}
                        </span>
                        <span className="text-[10px] text-[#555861]">
                          • {new Date(item.submittedAt).toLocaleDateString('es-BO')}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#F2412C] truncate">
                        {item.activityTitle}
                      </p>
                      <p className="text-[11px] text-[#555861] truncate">
                        {item.courseTitle}
                      </p>
                    </div>

                    <button
                      onClick={() => onNavigate('teacher-courses')}
                      className="px-3.5 py-2 bg-[#2B2D33] hover:bg-[#1E2024] text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
                    >
                      Calificar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Mis Cursos (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-[#2B2D33] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#F2412C]" /> Mis Cursos
                </h2>
                <p className="text-xs text-[#555861]">Gestión académica directa</p>
              </div>
              <button
                onClick={() => onNavigate('teacher-courses')}
                className="text-xs font-bold text-[#F2412C] hover:underline cursor-pointer"
              >
                Ver todos
              </button>
            </div>

            <div className="bg-white border border-[#D1D5DB] rounded-3xl p-5 shadow-xs space-y-3">
              {teacherCourses.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#555861]">
                  Aún no has creado cursos.
                </div>
              ) : (
                teacherCourses.map((c: any) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-2xl border border-[#E4E6EA] flex items-center justify-between gap-3 hover:bg-[#F8F9FA] transition"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-[#2B2D33] truncate">{c.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#555861]">
                        <span className="font-bold text-emerald-600">
                          {c.studentsCount} estudiantes
                        </span>
                        <span>•</span>
                        <span>{Number(c.price) === 0 ? 'Gratis' : `${c.price} ${c.currency}`}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate('teacher-courses')}
                      className="text-xs font-bold text-[#F2412C] hover:underline cursor-pointer shrink-0"
                    >
                      Gestionar →
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. VISTA DE INICIO PARA ADMINISTRADOR / SUPERADMIN
  // =========================================================================
  const stats = data?.stats || { pendingPaymentsCount: 0, totalStudentsCount: 0, monthlyRevenueBob: 0 };
  const weekly = data?.weeklyEnrollments || [];
  const topCourses = data?.topCourses || [];

  // Calcular valor máximo para escalar barras de SVG
  const maxWeeklyCount = Math.max(...weekly.map((w: any) => Number(w.count) || 0), 5);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#2B2D33]">
            Panel de Inicio Ejecutivo
          </h1>
          <p className="text-xs text-[#555861]">
            Métricas clave de ventas, inscripciones semanales y cursos más demandados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('admin', 'orders')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#D1D5DB] hover:bg-slate-50 text-[#2B2D33] text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
          >
            <CreditCard className="w-4 h-4 text-[#F2412C]" />
            <span>Gestionar Pagos</span>
          </button>
          <button
            onClick={() => onNavigate('admin', 'courses')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F2412C] hover:bg-[#d93520] text-white text-xs font-black rounded-xl transition cursor-pointer shadow-xs"
          >
            <BookOpen className="w-4 h-4" />
            <span>Ver Cursos</span>
          </button>
        </div>
      </div>

      {/* 3 KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Pagos Pendientes */}
        <div
          onClick={() => onNavigate('admin', 'orders')}
          className="bg-white border border-[#D1D5DB] rounded-3xl p-6 shadow-xs space-y-2 hover:border-[#F2412C] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#555861]">
              Pagos Pendientes
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-[#F2412C] flex items-center justify-center group-hover:scale-110 transition">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#2B2D33]">{stats.pendingPaymentsCount}</p>
          <p className="text-xs text-[#F2412C] font-bold flex items-center gap-1">
            Requieren revisión y aprobación manual →
          </p>
        </div>

        {/* Ingresos del Mes */}
        <div className="bg-white border border-[#D1D5DB] rounded-3xl p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#555861]">
              Ingresos del Mes
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600">
            {Number(stats.monthlyRevenueBob).toLocaleString('es-BO', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            <span className="text-lg font-bold text-[#555861]">Bs.</span>
          </p>
          <p className="text-xs text-[#555861]">Ventas confirmadas en el mes actual</p>
        </div>

        {/* Estudiantes Totales */}
        <div className="bg-white border border-[#D1D5DB] rounded-3xl p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#555861]">
              Estudiantes Activos
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#2B2D33]">{stats.totalStudentsCount}</p>
          <p className="text-xs text-[#555861]">Usuarios con inscripciones vigentes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Gráfico de Barras SVG: Inscripciones por Semana (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#D1D5DB] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-[#2B2D33] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#F2412C]" /> Inscripciones por Semana
              </h2>
              <p className="text-xs text-[#555861]">Evolución del registro de estudiantes (Últimas 6 semanas)</p>
            </div>
          </div>

          {/* Contenedor Gráfico SVG Simple & Responsivo */}
          <div className="pt-4 pb-2">
            <div className="h-48 w-full flex items-end gap-3 sm:gap-6 border-b border-[#E4E6EA] pb-2 px-2">
              {weekly.map((w: any, idx: number) => {
                const count = Number(w.count) || 0;
                const heightPct = Math.round((count / maxWeeklyCount) * 100);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    {/* Tooltip flotante con número */}
                    <span className="text-[10px] font-black text-[#2B2D33] bg-[#F8F9FA] px-1.5 py-0.5 rounded border border-[#E4E6EA] group-hover:scale-110 group-hover:bg-[#F2412C] group-hover:text-white transition">
                      {count}
                    </span>

                    {/* Barra */}
                    <div className="w-full max-w-[42px] bg-[#E4E6EA] rounded-t-xl overflow-hidden h-full flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-[#d93520] to-[#F2412C] rounded-t-xl group-hover:brightness-110 transition-all duration-500 shadow-sm"
                        style={{ height: `${Math.max(heightPct, 6)}%` }}
                      />
                    </div>

                    {/* Etiqueta de semana */}
                    <span className="text-[10px] font-extrabold text-[#555861] truncate w-full text-center">
                      {w.weekLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cursos Más Vendidos (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#D1D5DB] rounded-3xl p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-black text-[#2B2D33] flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" /> Cursos Más Demandados
            </h2>
            <p className="text-xs text-[#555861]">Ranking por inscripciones y recaudación</p>
          </div>

          <div className="space-y-3">
            {topCourses.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#555861]">
                No hay datos de ventas registrados aún.
              </div>
            ) : (
              topCourses.map((c: any, idx: number) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#E4E6EA] flex items-center justify-between gap-3 hover:border-[#D1D5DB] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-800'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      #{idx + 1}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-[#2B2D33] truncate">{c.title}</h4>
                      <p className="text-[11px] text-[#555861]">
                        {c.enrollmentsCount} estudiantes inscritos
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-emerald-700">
                      {Number(c.revenue).toLocaleString('es-BO')} Bs.
                    </span>
                    <p className="text-[10px] text-[#555861]">Recaudado</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
