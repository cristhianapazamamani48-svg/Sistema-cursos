import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Globe,
  ArrowRight,
  BookOpen,
  Image as ImageIcon,
  Layers,
  Video,
  ExternalLink,
} from 'lucide-react';
import { api } from './api';
import type { ManagedCourse } from './TeacherCoursesView';

export interface PublishChecklistData {
  canPublish: boolean;
  course: {
    id: number;
    title: string;
    status: string;
  };
  checklist: {
    title: {
      passed: boolean;
      label: string;
      message: string;
    };
    thumbnail: {
      passed: boolean;
      label: string;
      message: string;
    };
    modules: {
      passed: boolean;
      count: number;
      label: string;
      message: string;
    };
    lessons: {
      passed: boolean;
      totalLessons: number;
      approvedVideosCount: number;
      issues: string[];
      label: string;
      message: string;
    };
  };
}

interface PublishChecklistModalProps {
  isOpen: boolean;
  course: ManagedCourse | null;
  onClose: () => void;
  onSuccess: () => void;
  onGoToEditCourse: (course: ManagedCourse, step: 1 | 2 | 3) => void;
  onGoToCurriculum: (course: ManagedCourse) => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export default function PublishChecklistModal({
  isOpen,
  course,
  onClose,
  onSuccess,
  onGoToEditCourse,
  onGoToCurriculum,
  showToast,
}: PublishChecklistModalProps) {
  const [data, setData] = useState<PublishChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (isOpen && course) {
      loadChecklist();
    } else {
      setData(null);
    }
  }, [isOpen, course?.id]);

  const loadChecklist = async () => {
    if (!course) return;
    setLoading(true);
    try {
      const res = await api(`/api/courses/${course.id}/publish-checklist`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        showToast('error', 'No se pudo obtener la lista de verificación del curso');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPublish = async () => {
    if (!course || !data?.canPublish) return;
    setPublishing(true);
    try {
      const res = await api(`/api/courses/${course.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'published' }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || 'Error al publicar curso');
      }

      showToast('success', `¡El curso "${course.title}" ahora está Publicado para los estudiantes!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('error', err.message || 'No se pudo publicar el curso');
    } finally {
      setPublishing(false);
    }
  };

  if (!isOpen || !course) return null;

  const passedCount = data
    ? [
        data.checklist.title.passed,
        data.checklist.thumbnail.passed,
        data.checklist.modules.passed,
        data.checklist.lessons.passed,
      ].filter(Boolean).length
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#2B2D33]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-[#D1D5DB] rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Cabecera del Modal */}
        <div className="p-6 bg-[#2B2D33] text-white flex items-center justify-between border-b border-[#40444B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F2412C] flex items-center justify-center text-white shadow-md shadow-[#F2412C]/30">
              <Globe className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                Publicar Curso
              </h2>
              <p className="text-xs text-[#E4E6EA]/80 truncate max-w-sm">
                {course.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#363940] text-[#E4E6EA] transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Progreso de la Lista de Verificación */}
        <div className="px-6 py-3 bg-[#E4E6EA]/70 border-b border-[#D1D5DB] flex items-center justify-between">
          <span className="text-xs font-bold text-[#2B2D33]">
            Requisitos de Publicación ({passedCount} de 4 cumplidos)
          </span>
          <div className="flex items-center gap-2">
            <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  passedCount === 4 ? 'bg-emerald-500' : 'bg-[#F2412C]'
                }`}
                style={{ width: `${(passedCount / 4) * 100}%` }}
              />
            </div>
            <span
              className={`text-[11px] font-black font-mono ${
                passedCount === 4 ? 'text-emerald-700' : 'text-[#F2412C]'
              }`}
            >
              {Math.round((passedCount / 4) * 100)}%
            </span>
          </div>
        </div>

        {/* Contenido / Requisitos */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#F2412C] animate-spin mx-auto" />
              <p className="text-xs text-[#555861] font-medium">
                Analizando requisitos de publicación...
              </p>
            </div>
          ) : !data ? (
            <div className="p-6 text-center text-xs text-rose-600">
              Error al cargar los requisitos de este curso.
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* REQUISITO 1: TÍTULO */}
              <div
                className={`p-4 rounded-2xl border transition flex items-start justify-between gap-3 ${
                  data.checklist.title.passed
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      data.checklist.title.passed
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {data.checklist.title.passed ? (
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>
                  <div>
                    <h3
                      className={`text-xs font-bold ${
                        data.checklist.title.passed ? 'text-emerald-900' : 'text-rose-900'
                      }`}
                    >
                      {data.checklist.title.label}
                    </h3>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        data.checklist.title.passed ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {data.checklist.title.message}
                    </p>
                  </div>
                </div>

                {!data.checklist.title.passed && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onGoToEditCourse(course, 1);
                    }}
                    className="shrink-0 text-xs font-bold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-300 transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Corregir</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* REQUISITO 2: PORTADA */}
              <div
                className={`p-4 rounded-2xl border transition flex items-start justify-between gap-3 ${
                  data.checklist.thumbnail.passed
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      data.checklist.thumbnail.passed
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {data.checklist.thumbnail.passed ? (
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>
                  <div>
                    <h3
                      className={`text-xs font-bold ${
                        data.checklist.thumbnail.passed ? 'text-emerald-900' : 'text-rose-900'
                      }`}
                    >
                      {data.checklist.thumbnail.label}
                    </h3>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        data.checklist.thumbnail.passed ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {data.checklist.thumbnail.message}
                    </p>
                  </div>
                </div>

                {!data.checklist.thumbnail.passed && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onGoToEditCourse(course, 3);
                    }}
                    className="shrink-0 text-xs font-bold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-300 transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Subir Portada</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* REQUISITO 3: AL MENOS 1 MÓDULO */}
              <div
                className={`p-4 rounded-2xl border transition flex items-start justify-between gap-3 ${
                  data.checklist.modules.passed
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      data.checklist.modules.passed
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {data.checklist.modules.passed ? (
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>
                  <div>
                    <h3
                      className={`text-xs font-bold ${
                        data.checklist.modules.passed ? 'text-emerald-900' : 'text-rose-900'
                      }`}
                    >
                      {data.checklist.modules.label}
                    </h3>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        data.checklist.modules.passed ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {data.checklist.modules.message}
                    </p>
                  </div>
                </div>

                {!data.checklist.modules.passed && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onGoToCurriculum(course);
                    }}
                    className="shrink-0 text-xs font-bold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-300 transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ir a Temario</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* REQUISITO 4: CADA LECCIÓN CON VIDEO APROBADO */}
              <div
                className={`p-4 rounded-2xl border transition flex flex-col gap-2.5 ${
                  data.checklist.lessons.passed
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        data.checklist.lessons.passed
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {data.checklist.lessons.passed ? (
                        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </div>
                    <div>
                      <h3
                        className={`text-xs font-bold ${
                          data.checklist.lessons.passed ? 'text-emerald-900' : 'text-rose-900'
                        }`}
                      >
                        {data.checklist.lessons.label}
                      </h3>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          data.checklist.lessons.passed ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {data.checklist.lessons.message}
                      </p>
                    </div>
                  </div>

                  {!data.checklist.lessons.passed && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onGoToCurriculum(course);
                      }}
                      className="shrink-0 text-xs font-bold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-300 transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Gestionar Videos</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Lista de Lecciones Faltantes / Pendientes */}
                {!data.checklist.lessons.passed && data.checklist.lessons.issues.length > 0 && (
                  <div className="mt-2 bg-white/80 p-3 rounded-xl border border-rose-200 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider block">
                      Observaciones pendientes:
                    </span>
                    <ul className="text-[11px] text-rose-700 space-y-1 pl-1">
                      {data.checklist.lessons.issues.map((iss, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>{iss}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal con Acción Final */}
        <div className="p-5 bg-[#E4E6EA]/50 border-t border-[#D1D5DB] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={publishing}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#555861] hover:text-[#2B2D33] text-xs font-bold border border-[#D1D5DB] transition cursor-pointer"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-3">
            {!data?.canPublish && (
              <span className="hidden sm:inline text-[11px] text-[#555861] font-medium italic">
                Resuelve los puntos en rojo para habilitar
              </span>
            )}

            <button
              type="button"
              onClick={handleConfirmPublish}
              disabled={!data?.canPublish || publishing}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg transition cursor-pointer ${
                data?.canPublish
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 hover:scale-[1.02] cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Confirmar Publicación</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

