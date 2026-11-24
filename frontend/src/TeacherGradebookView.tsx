import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  UserCheck,
  Users,
  AlertCircle,
  Eye,
  Check,
} from 'lucide-react';
import { api } from './api';

export interface GradebookStudent {
  userId: number;
  enrollmentId: number;
  enrollmentStatus: string;
  enrolledAt: string;
  fullName: string;
  email: string;
  activities: Record<
    number,
    {
      id: number;
      activityId: number;
      content?: string;
      fileUrl?: string;
      grade: number | null;
      feedback?: string;
      status: 'submitted' | 'graded';
      submittedAt: string;
    } | null
  >;
  quizzes: Record<
    number,
    {
      quizId: number;
      bestScore: number;
      passed: boolean;
      attemptsCount: number;
    } | null
  >;
  stats: {
    submittedActivitiesCount: number;
    gradedActivitiesCount: number;
    totalActivities: number;
    avgActivityScore: number | null;
    passedQuizzesCount: number;
    totalQuizzes: number;
    avgQuizScore: number | null;
    finalGrade: number | null;
  };
}

export interface GradebookData {
  course: {
    id: number;
    title: string;
    slug: string;
  };
  units: Array<{
    module_id: number;
    module_title: string;
    lesson_id: number;
    lesson_title: string;
  }>;
  activities: Array<{
    id: number;
    lessonId: number;
    title: string;
    dueDate?: string | null;
  }>;
  quizzes: Array<{
    id: number;
    lessonId: number;
    title: string;
    passingScore: number;
    maxAttempts: number;
  }>;
  students: GradebookStudent[];
}

interface TeacherGradebookViewProps {
  courseId: number;
  courseTitle: string;
  onBack: () => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export default function TeacherGradebookView({
  courseId,
  courseTitle,
  onBack,
  showToast,
}: TeacherGradebookViewProps) {
  const [data, setData] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matrix' | 'grading'>('matrix');
  const [searchQuery, setSearchQuery] = useState('');

  // Pestaña de calificación por actividad
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [activitySubmissions, setActivitySubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Formulario de calificación
  const [gradingScores, setGradingScores] = useState<Record<number, number>>({});
  const [gradingFeedbacks, setGradingFeedbacks] = useState<Record<number, string>>({});
  const [savingSubmissionId, setSavingSubmissionId] = useState<number | null>(null);

  // Modal de detalle del estudiante
  const [selectedStudent, setSelectedStudent] = useState<GradebookStudent | null>(null);

  useEffect(() => {
    loadGradebook();
  }, [courseId]);

  const loadGradebook = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/units/course/${courseId}/gradebook`);
      if (res.ok) {
        const json: GradebookData = await res.json();
        setData(json);
        if (json.activities.length > 0 && selectedActivityId === null) {
          setSelectedActivityId(json.activities[0].id);
        }
      } else {
        showToast('error', 'No se pudo cargar el libro de calificaciones');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Cargar entregas cuando se selecciona una actividad en la pestaña 'grading'
  useEffect(() => {
    if (activeTab === 'grading' && selectedActivityId) {
      loadActivitySubmissions(selectedActivityId);
    }
  }, [activeTab, selectedActivityId]);

  const loadActivitySubmissions = async (activityId: number) => {
    setLoadingSubmissions(true);
    try {
      const res = await api(`/api/units/activities/${activityId}/submissions`);
      if (res.ok) {
        const json = await res.json();
        setActivitySubmissions(json.submissions || []);
        // Inicializar formularios
        const scores: Record<number, number> = {};
        const feedbacks: Record<number, string> = {};
        for (const sub of json.submissions || []) {
          if (sub.grade !== null) scores[sub.id] = sub.grade;
          if (sub.feedback) feedbacks[sub.id] = sub.feedback;
        }
        setGradingScores(scores);
        setGradingFeedbacks(feedbacks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Guardar calificación de una entrega individual
  const handleSaveGrade = async (submissionId: number) => {
    const score = gradingScores[submissionId];
    if (score === undefined || score < 0 || score > 100) {
      showToast('error', 'Ingresa una calificación válida entre 0 y 100');
      return;
    }
    const feedback = gradingFeedbacks[submissionId] || '';

    setSavingSubmissionId(submissionId);
    try {
      const res = await api(`/api/units/submissions/${submissionId}/grade`, {
        method: 'PATCH',
        body: JSON.stringify({ grade: score, feedback }),
      });
      if (res.ok) {
        showToast('success', 'Calificación y retroalimentación guardadas');
        if (selectedActivityId) loadActivitySubmissions(selectedActivityId);
        loadGradebook();
      } else {
        const err = await res.json();
        showToast('error', err.message || 'Error al guardar calificación');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error de conexión');
    } finally {
      setSavingSubmissionId(null);
    }
  };

  const filteredStudents = (data?.students || []).filter(
    (st) =>
      st.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header con botón de regreso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#D1D5DB] rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-[#F8F9FA] hover:bg-slate-200 text-[#2B2D33] border border-[#D1D5DB] transition cursor-pointer"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#F2412C]/10 text-[#F2412C] px-2.5 py-0.5 rounded border border-[#F2412C]/20">
                Gestión Docente
              </span>
              <span className="text-xs text-[#555861] font-semibold">Gradebook Oficial</span>
            </div>
            <h1 className="text-2xl font-black text-[#2B2D33] mt-0.5">
              Libro de Calificaciones
            </h1>
            <p className="text-xs text-[#555861]">Curso: {courseTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadGradebook}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#2B2D33] text-xs font-bold border border-[#D1D5DB] transition cursor-pointer"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Métricas Generales del Curso */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-[#D1D5DB] rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] text-[#555861] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#F2412C]" /> Estudiantes Inscritos
            </span>
            <div className="text-2xl font-black text-[#2B2D33] mt-1">
              {data.students.length}
            </div>
          </div>
          <div className="bg-white border border-[#D1D5DB] rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] text-[#555861] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" /> Actividades
            </span>
            <div className="text-2xl font-black text-[#2B2D33] mt-1">
              {data.activities.length}
            </div>
          </div>
          <div className="bg-white border border-[#D1D5DB] rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] text-[#555861] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Evaluaciones
            </span>
            <div className="text-2xl font-black text-[#2B2D33] mt-1">
              {data.quizzes.length}
            </div>
          </div>
          <div className="bg-white border border-[#D1D5DB] rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] text-[#555861] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-600" /> Promedio Grupal
            </span>
            <div className="text-2xl font-black text-[#2B2D33] mt-1">
              {(() => {
                const grades = data.students
                  .map((s) => s.stats.finalGrade)
                  .filter((g): g is number => g !== null);
                if (grades.length === 0) return '—';
                const avg = Math.round(grades.reduce((a, b) => a + b, 0) / grades.length);
                return `${avg} pts`;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Navegación por pestañas: Matriz vs Calificar Actividades */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-[#F8F9FA] p-1 rounded-2xl border border-[#D1D5DB]">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'bg-[#F2412C] text-white shadow-xs'
                : 'text-[#555861] hover:text-[#2B2D33]'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Matriz de Calificaciones</span>
          </button>
          <button
            onClick={() => setActiveTab('grading')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'grading'
                ? 'bg-[#F2412C] text-white shadow-xs'
                : 'text-[#555861] hover:text-[#2B2D33]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Revisar y Calificar Actividades</span>
          </button>
        </div>

        {activeTab === 'matrix' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#555861] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar estudiante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D1D5DB] text-xs focus:outline-none focus:border-[#F2412C] text-[#2B2D33]"
            />
          </div>
        )}
      </div>

      {/* PESTAÑA 1: MATRIZ DE CALIFICACIONES GENERAL */}
      {activeTab === 'matrix' && (
        <div className="bg-white border border-[#D1D5DB] rounded-3xl overflow-hidden shadow-xs animate-fade-in">
          {loading ? (
            <div className="p-16 text-center text-xs text-[#555861] flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#F2412C]" />
              <span>Cargando matriz de calificaciones...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-16 text-center text-xs text-[#555861] space-y-2">
              <Users className="w-10 h-10 text-[#555861] mx-auto opacity-60" />
              <p>No se encontraron estudiantes inscritos para mostrar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FA] border-b border-[#D1D5DB] text-[#555861] uppercase tracking-wider text-[10px] font-black">
                  <tr>
                    <th className="py-3.5 px-6">Estudiante</th>
                    <th className="py-3.5 px-4 text-center">Actividades</th>
                    <th className="py-3.5 px-4 text-center">Prom. Actividades</th>
                    <th className="py-3.5 px-4 text-center">Evaluaciones</th>
                    <th className="py-3.5 px-4 text-center">Prom. Quizzes</th>
                    <th className="py-3.5 px-4 text-center">Nota Final</th>
                    <th className="py-3.5 px-6 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E6EA] font-medium text-[#2B2D33]">
                  {filteredStudents.map((st) => {
                    const final = st.stats.finalGrade;
                    const isPassed = final !== null && final >= 70;

                    return (
                      <tr key={st.userId} className="hover:bg-slate-50/70 transition">
                        <td className="py-4 px-6">
                          <div className="font-bold text-[#2B2D33]">{st.fullName}</div>
                          <div className="text-[11px] text-[#555861] font-mono">{st.email}</div>
                        </td>

                        <td className="py-4 px-4 text-center font-bold">
                          <span className="text-[#2B2D33]">
                            {st.stats.submittedActivitiesCount}
                          </span>
                          <span className="text-[#555861] font-normal">
                            {' '}/ {st.stats.totalActivities}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center font-black">
                          {st.stats.avgActivityScore !== null ? (
                            <span
                              className={`px-2 py-0.5 rounded ${
                                st.stats.avgActivityScore >= 70
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {st.stats.avgActivityScore}%
                            </span>
                          ) : (
                            <span className="text-[#555861]">—</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center font-bold">
                          <span className="text-emerald-700">
                            {st.stats.passedQuizzesCount} aprobadas
                          </span>
                          <span className="text-[#555861] font-normal">
                            {' '}/ {st.stats.totalQuizzes}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center font-black">
                          {st.stats.avgQuizScore !== null ? (
                            <span
                              className={`px-2 py-0.5 rounded ${
                                st.stats.avgQuizScore >= 70
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {st.stats.avgQuizScore}%
                            </span>
                          ) : (
                            <span className="text-[#555861]">—</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center">
                          {final !== null ? (
                            <div className="inline-flex items-center gap-1 font-black text-sm">
                              <span
                                className={`px-3 py-1 rounded-xl ${
                                  isPassed
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-amber-500 text-white'
                                }`}
                              >
                                {final} pts
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#555861] text-xs">Sin evaluar</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => setSelectedStudent(st)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8F9FA] hover:bg-[#2B2D33] hover:text-white text-[#2B2D33] text-xs font-bold border border-[#D1D5DB] transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Ficha</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: REVISIÓN Y CALIFICACIÓN DE ACTIVIDADES */}
      {activeTab === 'grading' && (
        <div className="space-y-6 animate-fade-in">
          {/* Selector de Actividad */}
          <div className="bg-white border border-[#D1D5DB] rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-[#555861]">
                Seleccionar Actividad a Calificar:
              </label>
              {data && data.activities.length > 0 ? (
                <select
                  value={selectedActivityId || ''}
                  onChange={(e) => setSelectedActivityId(Number(e.target.value))}
                  className="w-full sm:w-96 p-2.5 rounded-xl border border-[#D1D5DB] text-xs font-bold text-[#2B2D33] bg-[#F8F9FA]"
                >
                  {data.activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-[#555861]">No hay actividades creadas en este curso.</p>
              )}
            </div>

            {selectedActivityId && (
              <button
                onClick={() => loadActivitySubmissions(selectedActivityId)}
                disabled={loadingSubmissions}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F8F9FA] hover:bg-slate-200 text-[#2B2D33] text-xs font-bold border border-[#D1D5DB] transition cursor-pointer self-start sm:self-auto"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loadingSubmissions ? 'animate-spin' : ''}`} />
                <span>Recargar Entregas</span>
              </button>
            )}
          </div>

          {/* Listado de entregas de los estudiantes para la actividad seleccionada */}
          <div className="space-y-4">
            {loadingSubmissions ? (
              <div className="bg-white border border-[#D1D5DB] rounded-3xl p-16 text-center text-xs text-[#555861] flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#F2412C]" />
                <span>Cargando entregas...</span>
              </div>
            ) : activitySubmissions.length === 0 ? (
              <div className="bg-white border border-[#D1D5DB] rounded-3xl p-16 text-center text-xs text-[#555861] space-y-2">
                <FileText className="w-10 h-10 text-[#555861] mx-auto opacity-60" />
                <h4 className="font-bold text-[#2B2D33]">Sin entregas registradas</h4>
                <p>Ningún estudiante ha subido su resolución para esta actividad aún.</p>
              </div>
            ) : (
              activitySubmissions.map((sub) => {
                const isGraded = sub.status === 'graded';
                const isSaving = savingSubmissionId === sub.id;

                return (
                  <div
                    key={sub.id}
                    className={`bg-white border rounded-3xl p-6 shadow-xs space-y-4 transition ${
                      isGraded ? 'border-[#D1D5DB]' : 'border-indigo-300 ring-2 ring-indigo-50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E4E6EA] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-[#2B2D33]">{sub.studentName}</span>
                          <span className="text-xs text-[#555861] font-mono">({sub.studentEmail})</span>
                        </div>
                        <span className="text-[11px] text-[#555861]">
                          Entregado: {new Date(sub.submittedAt).toLocaleDateString()} a las{' '}
                          {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {isGraded ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 self-start sm:self-auto">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Calificado ({sub.grade} pts)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 self-start sm:self-auto">
                          <Clock className="w-4 h-4 text-amber-600" />
                          Pendiente de Revisión
                        </span>
                      )}
                    </div>

                    {/* Contenido de la entrega del estudiante */}
                    <div className="bg-[#F8F9FA] border border-[#E4E6EA] p-4 rounded-2xl space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#555861] block">
                        Respuesta / Trabajo del Estudiante:
                      </span>
                      <p className="text-xs text-[#2B2D33] whitespace-pre-wrap leading-relaxed">
                        {sub.content || '(Sin texto escrito)'}
                      </p>
                      {sub.fileUrl && (
                        <div className="pt-2">
                          <a
                            href={sub.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#D1D5DB] text-xs font-bold text-[#2B2D33] hover:text-[#F2412C] transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Ver enlace o archivo adjunto</span>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Formulario de Calificación y Retroalimentación */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-2">
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-bold text-[#2B2D33] mb-1">
                          Nota (0 a 100 pts):
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="Ej. 85"
                          value={gradingScores[sub.id] ?? ''}
                          onChange={(e) =>
                            setGradingScores((prev) => ({
                              ...prev,
                              [sub.id]: Number(e.target.value),
                            }))
                          }
                          className="w-full p-2.5 rounded-xl border border-[#D1D5DB] text-xs font-black text-[#2B2D33] bg-white"
                        />
                      </div>

                      <div className="sm:col-span-7">
                        <label className="block text-xs font-bold text-[#2B2D33] mb-1">
                          Retroalimentación del Docente (Feedback):
                        </label>
                        <input
                          type="text"
                          placeholder="Observaciones, comentarios de mejora o felicitaciones..."
                          value={gradingFeedbacks[sub.id] ?? ''}
                          onChange={(e) =>
                            setGradingFeedbacks((prev) => ({
                              ...prev,
                              [sub.id]: e.target.value,
                            }))
                          }
                          className="w-full p-2.5 rounded-xl border border-[#D1D5DB] text-xs text-[#2B2D33] bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          onClick={() => handleSaveGrade(sub.id)}
                          disabled={isSaving}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F2412C] hover:bg-[#D93522] text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>Guardar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL / FICHA INDIVIDUAL DEL ESTUDIANTE */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-[#1A1C20]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D1D5DB] rounded-3xl shadow-2xl p-6 max-w-2xl w-full space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E4E6EA] pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#F2412C] bg-[#F2412C]/10 px-2 py-0.5 rounded">
                  Ficha Académica
                </span>
                <h3 className="text-lg font-black text-[#2B2D33] mt-1">{selectedStudent.fullName}</h3>
                <p className="text-xs text-[#555861] font-mono">{selectedStudent.email}</p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-[#555861] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 bg-[#F8F9FA] rounded-2xl border border-[#D1D5DB]">
                <span className="text-[#555861] block text-[11px]">Prom. Actividades</span>
                <span className="text-base font-black text-[#2B2D33]">
                  {selectedStudent.stats.avgActivityScore !== null
                    ? `${selectedStudent.stats.avgActivityScore}%`
                    : '—'}
                </span>
              </div>
              <div className="p-3 bg-[#F8F9FA] rounded-2xl border border-[#D1D5DB]">
                <span className="text-[#555861] block text-[11px]">Prom. Evaluaciones</span>
                <span className="text-base font-black text-[#2B2D33]">
                  {selectedStudent.stats.avgQuizScore !== null
                    ? `${selectedStudent.stats.avgQuizScore}%`
                    : '—'}
                </span>
              </div>
              <div className="p-3 bg-[#F8F9FA] rounded-2xl border border-[#D1D5DB]">
                <span className="text-[#555861] block text-[11px]">Nota Final</span>
                <span className="text-base font-black text-[#F2412C]">
                  {selectedStudent.stats.finalGrade !== null
                    ? `${selectedStudent.stats.finalGrade} pts`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Desglose por actividad */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#2B2D33]">
                Detalle de Actividades Prácticas
              </h4>
              {data?.activities.map((a) => {
                const sub = selectedStudent.activities[a.id];
                return (
                  <div
                    key={a.id}
                    className="p-3 rounded-xl border border-[#E4E6EA] bg-[#F8F9FA] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#2B2D33]">{a.title}</div>
                      {sub?.feedback && (
                        <div className="text-[11px] text-[#555861] italic mt-0.5">
                          "{sub.feedback}"
                        </div>
                      )}
                    </div>
                    {sub ? (
                      <span className="font-black px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900">
                        {sub.grade !== null ? `${sub.grade} pts` : 'Pendiente revisión'}
                      </span>
                    ) : (
                      <span className="text-[#555861] italic">Sin entrega</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desglose por evaluación */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#2B2D33]">
                Detalle de Evaluaciones / Quizzes
              </h4>
              {data?.quizzes.map((q) => {
                const att = selectedStudent.quizzes[q.id];
                return (
                  <div
                    key={q.id}
                    className="p-3 rounded-xl border border-[#E4E6EA] bg-[#F8F9FA] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#2B2D33]">{q.title}</div>
                      <span className="text-[10px] text-[#555861]">
                        Exigencia: {q.passingScore}%
                      </span>
                    </div>
                    {att ? (
                      <span
                        className={`font-black px-2.5 py-1 rounded-lg ${
                          att.passed
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {att.bestScore}% ({att.attemptsCount} intentos)
                      </span>
                    ) : (
                      <span className="text-[#555861] italic">No realizado</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2 rounded-xl bg-[#2B2D33] text-white text-xs font-bold cursor-pointer hover:bg-black"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
