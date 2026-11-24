import React, { useState, useEffect } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { api } from './api';

interface StudentGradesData {
  course: {
    id: number;
    title: string;
    slug: string;
  };
  enrollment: {
    id: number;
    status: string;
    enrolledAt: string;
  };
  summary: {
    finalGrade: number | null;
    avgActivityScore: number | null;
    avgQuizScore: number | null;
    totalActivities: number;
    submittedActivities: number;
    gradedActivities: number;
    totalQuizzes: number;
    passedQuizzes: number;
  };
  activities: Array<{
    id: number;
    lessonId: number;
    title: string;
    description?: string | null;
    dueDate?: string | null;
    submissionId?: number | null;
    content?: string | null;
    fileUrl?: string | null;
    grade?: number | null;
    feedback?: string | null;
    status?: 'submitted' | 'graded';
    submittedAt?: string | null;
  }>;
  quizzes: Array<{
    id: number;
    lessonId: number;
    title: string;
    description?: string | null;
    passingScore: number;
    maxAttempts: number;
    bestScore: number | null;
    passed: boolean;
    attemptsCount: number;
  }>;
  modules: Array<{
    module_id: number;
    module_title: string;
    module_order: number;
    lesson_id: number;
    lesson_title: string;
    lesson_order: number;
    lesson_completed: boolean;
  }>;
}

interface StudentGradesViewProps {
  courseSlug: string;
  onOpenCertificate?: (enrollmentId: number) => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export default function StudentGradesView({
  courseSlug,
  onOpenCertificate,
  showToast,
}: StudentGradesViewProps) {
  const [data, setData] = useState<StudentGradesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGrades();
  }, [courseSlug]);

  const loadGrades = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/units/course/slug/${courseSlug}/my-grades`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        showToast('error', 'No se pudo cargar el boletín de calificaciones');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#D1D5DB] rounded-3xl p-16 text-center text-xs text-[#555861] flex items-center justify-center gap-2 shadow-xs">
        <Loader2 className="w-5 h-5 animate-spin text-[#F2412C]" />
        <span>Cargando tu boletín académico...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white border border-[#D1D5DB] rounded-3xl p-16 text-center text-xs text-[#555861] space-y-2 shadow-xs">
        <AlertCircle className="w-8 h-8 text-[#555861] mx-auto opacity-60" />
        <p>No se encontraron registros de calificaciones para este curso.</p>
      </div>
    );
  }

  const { summary, activities, quizzes, modules, enrollment } = data;
  const isPassedCourse = summary.finalGrade !== null && summary.finalGrade >= 70;

  return (
    <div className="space-y-6 animate-fade-in text-[#2B2D33]">
      {/* Header del Boletín */}
      <div className="bg-white border border-[#D1D5DB] rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded border border-emerald-300">
              Boletín Oficial
            </span>
            <span className="text-xs text-[#555861]">Registro de Desempeño Académico</span>
          </div>
          <h2 className="text-2xl font-black text-[#2B2D33] mt-1">Mis Calificaciones</h2>
          <p className="text-xs text-[#555861]">Curso: {data.course.title}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {enrollment.status === 'completed' && onOpenCertificate && (
            <button
              onClick={() => onOpenCertificate(enrollment.id)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-white text-xs font-black shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>Ver Certificado</span>
            </button>
          )}

          <button
            onClick={loadGrades}
            className="p-2.5 rounded-xl bg-[#F8F9FA] hover:bg-slate-200 text-[#2B2D33] border border-[#D1D5DB] transition cursor-pointer"
            title="Actualizar notas"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen General */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Nota Final */}
        <div className="bg-white border border-[#D1D5DB] rounded-2xl p-5 shadow-xs space-y-2">
          <span className="text-[11px] text-[#555861] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[#F2412C]" /> Calificación Final
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#2B2D33]">
              {summary.finalGrade !== null ? summary.finalGrade : '—'}
            </span>
            {summary.finalGrade !== null && <span className="text-xs text-[#555861] font-bold">/ 100 pts</span>}
          </div>
          <div className="text-[11px]">
            {summary.finalGrade !== null ? (
              isPassedCourse ? (
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Estado: Aprobado
                </span>
              ) : (
                <span className="font-bold text-amber-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Estado: En recuperación
                </span>
              )
            ) : (
              <span className="text-[#555861]">En desarrollo</span>
            )}
          </div>
        </div>

        {/* Promedio de Actividades */}
        <div className="bg-white border border-[#D1D5DB] rounded-2xl p-5 shadow-xs space-y-2">
          <span className="text-[11px] text-[#555861] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-600" /> Promedio Actividades
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#2B2D33]">
              {summary.avgActivityScore !== null ? `${summary.avgActivityScore}%` : '—'}
            </span>
          </div>
          <p className="text-[11px] text-[#555861]">
            {summary.gradedActivities} de {summary.totalActivities} actividades calificadas
          </p>
        </div>

        {/* Promedio de Quizzes */}
        <div className="bg-white border border-[#D1D5DB] rounded-2xl p-5 shadow-xs space-y-2">
          <span className="text-[11px] text-[#555861] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-amber-600" /> Promedio Evaluaciones
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#2B2D33]">
              {summary.avgQuizScore !== null ? `${summary.avgQuizScore}%` : '—'}
            </span>
          </div>
          <p className="text-[11px] text-[#555861]">
            {summary.passedQuizzes} de {summary.totalQuizzes} evaluaciones aprobadas
          </p>
        </div>

        {/* Rendimiento Global */}
        <div className="bg-white border border-[#D1D5DB] rounded-2xl p-5 shadow-xs space-y-2">
          <span className="text-[11px] text-[#555861] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Entregas Realizadas
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#2B2D33]">
              {summary.submittedActivities}
            </span>
            <span className="text-xs text-[#555861] font-bold">/ {summary.totalActivities}</span>
          </div>
          <p className="text-[11px] text-[#555861]">
            Cumplimiento:{' '}
            {summary.totalActivities > 0
              ? Math.round((summary.submittedActivities / summary.totalActivities) * 100)
              : 100}
            %
          </p>
        </div>
      </div>

      {/* SECCIÓN 1: DETALLE DE ACTIVIDADES PRÁCTICAS */}
      <div className="bg-white border border-[#D1D5DB] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4E6EA] pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-[#2B2D33]">Actividades Prácticas y Tareas</h3>
          </div>
          <span className="text-xs text-[#555861] font-bold">
            {activities.length} actividad(es)
          </span>
        </div>

        {activities.length === 0 ? (
          <p className="text-center text-xs text-[#555861] py-6">
            No se han registrado actividades prácticas en este curso.
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((act) => {
              const isGraded = act.status === 'graded';
              const isSubmitted = Boolean(act.submissionId);

              return (
                <div
                  key={act.id}
                  className="bg-[#F8F9FA] border border-[#E4E6EA] rounded-2xl p-4.5 space-y-3 transition hover:border-[#D1D5DB]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-[#2B2D33]">{act.title}</h4>
                      {act.description && (
                        <p className="text-[11px] text-[#555861] mt-0.5">{act.description}</p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {isGraded ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Calificación: {act.grade} / 100 pts
                        </span>
                      ) : isSubmitted ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Entregado (En revisión)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-[#E4E6EA] text-[#555861]">
                          Pendiente de entrega
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Feedback o comentarios del docente si está calificado */}
                  {act.feedback && (
                    <div className="bg-white border border-[#D1D5DB] rounded-xl p-3 text-xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#F2412C] flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Devolución del Docente:
                      </span>
                      <p className="text-[#2B2D33] italic">"{act.feedback}"</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: DETALLE DE EVALUACIONES / CUESTIONARIOS */}
      <div className="bg-white border border-[#D1D5DB] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4E6EA] pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-[#2B2D33]">Evaluaciones de Conocimiento (Quizzes)</h3>
          </div>
          <span className="text-xs text-[#555861] font-bold">
            {quizzes.length} evaluación(es)
          </span>
        </div>

        {quizzes.length === 0 ? (
          <p className="text-center text-xs text-[#555861] py-6">
            No se han registrado evaluaciones en este curso.
          </p>
        ) : (
          <div className="space-y-3">
            {quizzes.map((qz) => {
              const hasAttempt = qz.bestScore !== null;

              return (
                <div
                  key={qz.id}
                  className="bg-[#F8F9FA] border border-[#E4E6EA] rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition hover:border-[#D1D5DB]"
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-[#2B2D33]">{qz.title}</h4>
                    <div className="flex items-center gap-3 text-[11px] text-[#555861]">
                      <span>Exigencia mínima: <strong>{qz.passingScore}%</strong></span>
                      <span>Intentos permitidos: <strong>{qz.maxAttempts}</strong></span>
                      {hasAttempt && (
                        <span>Intentos realizados: <strong>{qz.attemptsCount}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {hasAttempt ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${
                            qz.passed
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {qz.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          <span>
                            {qz.bestScore}% ({qz.passed ? 'Aprobado' : 'No alcanzado'})
                          </span>
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E4E6EA] text-[#555861]">
                        Sin responder
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
