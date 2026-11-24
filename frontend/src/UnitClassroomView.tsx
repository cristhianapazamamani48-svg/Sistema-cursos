import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  MessageSquare,
  HelpCircle,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Send,
  Loader2,
  Clock,
  Award,
  Download,
  Link as LinkIcon,
  File,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { api } from './api';
import YouTubeTracker from './YouTubeTracker';

export interface ClassroomLessonProps {
  id: number;
  title: string;
  description?: string | null;
  isLocked: boolean;
  isCompleted: boolean;
  currentWatchPercentage?: number;
  studyMaterialUrl?: string | null;
  studyMaterialContent?: string | null;
  video: {
    id: number;
    providerRef: string | null;
    durationSeconds: number | null;
  } | null;
}

interface UnitResource {
  id: number;
  title: string;
  type: 'pdf' | 'link' | 'image' | 'other';
  url: string;
  materialCategory: 'study' | 'complementary';
  createdAt: string;
}

interface UnitActivity {
  id: number;
  title: string;
  description?: string | null;
  instructions?: string | null;
  dueDate?: string | null;
  mySubmission?: {
    id: number;
    content?: string | null;
    fileUrl?: string | null;
    submittedAt: string;
    grade?: number | null;
    feedback?: string | null;
    status: 'submitted' | 'graded';
  } | null;
}

interface ForumMessage {
  id: number;
  forumId: number;
  userId: number;
  message: string;
  createdAt: string;
  authorName: string;
  authorRole: string;
}

interface UnitForum {
  id: number;
  lessonId: number;
  title: string;
  description?: string | null;
  isClosed: boolean;
  messages: ForumMessage[];
}

interface QuizOption {
  id: number;
  optionText: string;
}

interface QuizQuestion {
  id: number;
  questionText: string;
  questionType: string;
  points: number;
  explanation?: string | null;
  options: QuizOption[];
}

interface UnitQuiz {
  id: number;
  title: string;
  description?: string | null;
  passingScore: number;
  maxAttempts: number;
  timeLimitMins?: number | null;
  questions: QuizQuestion[];
  myAttemptsCount: number;
  lastAttempt?: {
    id: number;
    score: number;
    passed: boolean;
    attemptNumber: number;
    completedAt: string;
  } | null;
}

interface UnitClassroomViewProps {
  lesson: ClassroomLessonProps;
  courseSlug: string;
  minWatchPercentage: number;
  onRefreshClassroom: () => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

type PedagogicalTab = 'estudio' | 'complementario' | 'actividad' | 'foro' | 'evaluacion';

export default function UnitClassroomView({
  lesson,
  courseSlug,
  minWatchPercentage,
  onRefreshClassroom,
  showToast,
}: UnitClassroomViewProps) {
  const [activeTab, setActiveTab] = useState<PedagogicalTab>('estudio');

  // Recursos complementarios
  const [resources, setResources] = useState<UnitResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  // Actividades
  const [activities, setActivities] = useState<UnitActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submittingActivityId, setSubmittingActivityId] = useState<number | null>(null);

  // Foro
  const [forum, setForum] = useState<UnitForum | null>(null);
  const [loadingForum, setLoadingForum] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [postingMessage, setPostingMessage] = useState(false);

  // Evaluación
  const [quiz, setQuiz] = useState<UnitQuiz | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    passed: boolean;
    earnedPoints: number;
    totalPoints: number;
    passingScore: number;
    attemptNumber: number;
    maxAttempts: number;
  } | null>(null);

  // Cargar datos según pestaña
  useEffect(() => {
    if (activeTab === 'complementario') {
      loadResources();
    } else if (activeTab === 'actividad') {
      loadActivities();
    } else if (activeTab === 'foro') {
      loadForum();
    } else if (activeTab === 'evaluacion') {
      loadQuiz();
    }
  }, [lesson.id, activeTab]);

  // Cargar recursos complementarios
  const loadResources = async () => {
    setLoadingResources(true);
    try {
      const res = await api(`/api/units/${lesson.id}/resources`);
      if (res.ok) {
        const data = await res.json();
        setResources(data || []);
      }
    } catch (err) {
      console.error('Error cargando recursos:', err);
    } finally {
      setLoadingResources(false);
    }
  };

  // Cargar actividades prácticas
  const loadActivities = async () => {
    setLoadingActivities(true);
    try {
      const res = await api(`/api/units/${lesson.id}/activities`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data || []);
      }
    } catch (err) {
      console.error('Error cargando actividades:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  // Entregar actividad
  const handleSubmitActivity = async (activityId: number) => {
    if (!submissionContent.trim()) {
      showToast('error', 'Por favor escribe el contenido de tu entrega.');
      return;
    }
    setSubmittingActivityId(activityId);
    try {
      const res = await api(`/api/units/activities/${activityId}/submissions`, {
        method: 'POST',
        body: JSON.stringify({ content: submissionContent.trim() }),
      });
      if (res.ok) {
        showToast('success', '¡Actividad entregada exitosamente!');
        setSubmissionContent('');
        loadActivities();
      } else {
        const err = await res.json();
        showToast('error', err.message || 'Error al enviar entrega');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error de conexión');
    } finally {
      setSubmittingActivityId(null);
    }
  };

  // Cargar foro
  const loadForum = async () => {
    setLoadingForum(true);
    try {
      const res = await api(`/api/units/${lesson.id}/forum`);
      if (res.ok) {
        const data = await res.json();
        setForum(data);
      }
    } catch (err) {
      console.error('Error cargando foro:', err);
    } finally {
      setLoadingForum(false);
    }
  };

  // Enviar mensaje al foro
  const handlePostForumMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setPostingMessage(true);
    try {
      const res = await api(`/api/units/${lesson.id}/forum/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: newMessage.trim() }),
      });
      if (res.ok) {
        showToast('success', 'Mensaje publicado en el foro');
        setNewMessage('');
        loadForum();
      } else {
        const err = await res.json();
        showToast('error', err.message || 'Error al publicar mensaje');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error al conectar con el foro');
    } finally {
      setPostingMessage(false);
    }
  };

  // Cargar cuestionario/evaluación
  const loadQuiz = async () => {
    setLoadingQuiz(true);
    try {
      const res = await api(`/api/units/${lesson.id}/quiz`);
      if (res.ok) {
        const data = await res.json();
        setQuiz(data);
        if (data?.lastAttempt) {
          setQuizResult({
            score: data.lastAttempt.score,
            passed: data.lastAttempt.passed,
            earnedPoints: 0,
            totalPoints: 0,
            passingScore: data.passingScore,
            attemptNumber: data.lastAttempt.attemptNumber,
            maxAttempts: data.maxAttempts,
          });
        }
      }
    } catch (err) {
      console.error('Error cargando evaluación:', err);
    } finally {
      setLoadingQuiz(false);
    }
  };

  // Enviar intento de cuestionario
  const handleSubmitQuizAttempt = async () => {
    if (!quiz) return;
    if (Object.keys(selectedAnswers).length === 0) {
      showToast('error', 'Por favor responde al menos una pregunta antes de enviar.');
      return;
    }
    setSubmittingQuiz(true);
    try {
      const res = await api(`/api/units/quiz/${quiz.id}/attempt`, {
        method: 'POST',
        body: JSON.stringify({ answers: selectedAnswers }),
      });
      const data = await res.json();
      if (res.ok) {
        setQuizResult(data);
        if (data.passed) {
          showToast('success', `¡Felicitaciones! Has aprobado con ${data.score}%`);
        } else {
          showToast('info', `Obtuviste ${data.score}%. Se requiere ${data.passingScore}% para aprobar.`);
        }
        loadQuiz();
      } else {
        showToast('error', data.message || 'Error al enviar evaluación');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error al conectar con el servidor');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de pestañas pedagógicas de la unidad */}
      <div className="bg-[#F8F9FA] border border-[#D1D5DB] p-1.5 rounded-2xl flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('estudio')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'estudio'
              ? 'bg-[#F2412C] text-white shadow-sm'
              : 'text-[#555861] hover:text-[#2B2D33] hover:bg-white/60'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Material de Estudio</span>
        </button>

        <button
          onClick={() => setActiveTab('complementario')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'complementario'
              ? 'bg-[#F2412C] text-white shadow-sm'
              : 'text-[#555861] hover:text-[#2B2D33] hover:bg-white/60'
          }`}
        >
          <Paperclip className="w-4 h-4" />
          <span>Material Complementario</span>
          {resources.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
              {resources.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('actividad')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'actividad'
              ? 'bg-[#F2412C] text-white shadow-sm'
              : 'text-[#555861] hover:text-[#2B2D33] hover:bg-white/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Actividades</span>
        </button>

        <button
          onClick={() => setActiveTab('foro')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'foro'
              ? 'bg-[#F2412C] text-white shadow-sm'
              : 'text-[#555861] hover:text-[#2B2D33] hover:bg-white/60'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Foro de la Unidad</span>
        </button>

        <button
          onClick={() => setActiveTab('evaluacion')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'evaluacion'
              ? 'bg-[#F2412C] text-white shadow-sm'
              : 'text-[#555861] hover:text-[#2B2D33] hover:bg-white/60'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Evaluación</span>
        </button>
      </div>

      {/* CONTENIDO DE LA PESTAÑA: 1. MATERIAL DE ESTUDIO (ENLACE A VIDEOS/CLASES) */}
      {activeTab === 'estudio' && (
        <div className="space-y-6 animate-fade-in">
          {/* Enlace o botón hacia el módulo de clases / videos */}
          {lesson.studyMaterialUrl ? (
            <div className="bg-gradient-to-r from-[#2B2D33] to-[#363940] rounded-2xl p-6 text-white shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-[#F2412C] text-white px-2 py-0.5 rounded">
                      Enlace Directo
                    </span>
                    <h3 className="text-base font-bold">Módulo de Clases y Videos Grabados</h3>
                  </div>
                  <p className="text-xs text-[#E4E6EA]/90 leading-relaxed max-w-xl">
                    Accede a la grabación, sesión en vivo o repositorio interactivo preparado para esta unidad temática.
                  </p>
                </div>
                <a
                  href={lesson.studyMaterialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F2412C] hover:bg-[#D93522] text-white text-xs font-black transition shadow-lg shadow-[#F2412C]/30 shrink-0 cursor-pointer"
                >
                  <span>Abrir Clase / Video</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-[11px] text-[#E4E6EA]/70">
                <LinkIcon className="w-3.5 h-3.5" />
                <span className="font-mono truncate">{lesson.studyMaterialUrl}</span>
              </div>
            </div>
          ) : (
            <div className="bg-[#F8F9FA] border border-[#D1D5DB] rounded-2xl p-5 text-center text-xs text-[#555861] space-y-2">
              <BookOpen className="w-8 h-8 text-[#555861] mx-auto opacity-60" />
              <p>El docente aún no ha especificado un enlace externo al módulo de clases para esta unidad.</p>
            </div>
          )}

          {/* Resumen o notas de estudio de la lección */}
          {lesson.studyMaterialContent && (
            <div className="bg-white border border-[#D1D5DB] rounded-2xl p-6 space-y-3 shadow-xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#555861] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F2412C]" />
                Guía y Notas de Estudio de la Unidad
              </h4>
              <div className="text-xs text-[#2B2D33] whitespace-pre-wrap leading-relaxed bg-[#F8F9FA] p-4 rounded-xl border border-[#E4E6EA]">
                {lesson.studyMaterialContent}
              </div>
            </div>
          )}

          {/* Reproductor si la unidad contiene video asignado con control de asistencia */}
          {lesson.video?.providerRef && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#2B2D33]">Video de la Unidad (Seguimiento de Asistencia)</span>
                <span className="text-[#555861] text-[11px]">Mínimo: {minWatchPercentage}%</span>
              </div>
              <YouTubeTracker
                videoId={lesson.video.providerRef}
                lessonId={lesson.id}
                minWatchPercentage={minWatchPercentage}
                onProgressUpdate={(stats) => {
                  if (stats.isCompleted) {
                    showToast('success', '¡Felicitaciones! Has completado esta lección.');
                    onRefreshClassroom();
                  }
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO DE LA PESTAÑA: 2. MATERIAL COMPLEMENTARIO */}
      {activeTab === 'complementario' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#2B2D33]">Material de Lectura y Complementario</h3>
              <p className="text-xs text-[#555861]">Documentos, enlaces y bibliografía recomendada para profundizar.</p>
            </div>
            <button
              onClick={loadResources}
              disabled={loadingResources}
              className="p-2 rounded-xl hover:bg-slate-100 text-[#555861] transition"
              title="Actualizar recursos"
            >
              <RotateCcw className={`w-4 h-4 ${loadingResources ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingResources ? (
            <div className="p-8 text-center text-xs text-[#555861] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#F2412C]" />
              <span>Cargando materiales...</span>
            </div>
          ) : resources.length === 0 ? (
            <div className="bg-[#F8F9FA] border border-[#D1D5DB] rounded-2xl p-8 text-center text-xs text-[#555861] space-y-2">
              <File className="w-8 h-8 text-[#555861] mx-auto opacity-60" />
              <p>No hay materiales complementarios cargados para esta unidad.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {resources.map((res) => (
                <div
                  key={res.id}
                  className="bg-white border border-[#D1D5DB] rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs hover:border-[#F2412C]/40 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-red-50 text-[#F2412C] flex items-center justify-center shrink-0">
                      {res.type === 'pdf' ? (
                        <FileText className="w-5 h-5" />
                      ) : res.type === 'link' ? (
                        <LinkIcon className="w-5 h-5" />
                      ) : (
                        <Paperclip className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#2B2D33] truncate">{res.title}</h4>
                      <span className="text-[10px] uppercase font-bold text-[#555861]">{res.type}</span>
                    </div>
                  </div>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8F9FA] hover:bg-[#F2412C] hover:text-white text-[#2B2D33] text-xs font-bold border border-[#D1D5DB] transition shrink-0 cursor-pointer"
                  >
                    <span>Abrir</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO DE LA PESTAÑA: 3. ACTIVIDADES PRÁCTICAS */}
      {activeTab === 'actividad' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-[#2B2D33]">Actividades Prácticas y Tareas</h3>
            <p className="text-xs text-[#555861]">Desarrolla las consignas prácticas asignadas para esta unidad.</p>
          </div>

          {loadingActivities ? (
            <div className="p-8 text-center text-xs text-[#555861] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#F2412C]" />
              <span>Cargando actividades...</span>
            </div>
          ) : activities.length === 0 ? (
            <div className="bg-[#F8F9FA] border border-[#D1D5DB] rounded-2xl p-8 text-center text-xs text-[#555861] space-y-2">
              <FileText className="w-8 h-8 text-[#555861] mx-auto opacity-60" />
              <p>No se han registrado actividades prácticas para esta unidad temática.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((act) => {
                const hasSubmission = Boolean(act.mySubmission);

                return (
                  <div key={act.id} className="bg-white border border-[#D1D5DB] rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                            Actividad
                          </span>
                          <h4 className="text-sm font-bold text-[#2B2D33]">{act.title}</h4>
                        </div>
                        {act.description && <p className="text-xs text-[#555861]">{act.description}</p>}
                      </div>

                      {hasSubmission ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 self-start sm:self-auto">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Entregada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 self-start sm:self-auto">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Pendiente de entrega
                        </span>
                      )}
                    </div>

                    {act.instructions && (
                      <div className="bg-[#F8F9FA] p-3.5 rounded-xl border border-[#E4E6EA] space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#555861]">
                          Instrucciones:
                        </span>
                        <p className="text-xs text-[#2B2D33] leading-relaxed whitespace-pre-wrap">
                          {act.instructions}
                        </p>
                      </div>
                    )}

                    {/* Entrega del estudiante si ya existe */}
                    {hasSubmission ? (
                      <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold text-emerald-950">
                          <span>Tu Respuesta Entregada:</span>
                          <span className="text-[11px] font-normal text-emerald-700">
                            {new Date(act.mySubmission!.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[#2B2D33] whitespace-pre-wrap">{act.mySubmission?.content}</p>
                        {act.mySubmission?.feedback && (
                          <div className="mt-2 pt-2 border-t border-emerald-200 text-xs">
                            <span className="font-bold text-emerald-900">Retroalimentación del docente:</span>
                            <p className="text-emerald-800">{act.mySubmission.feedback}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Formulario de entrega */
                      <div className="space-y-3 pt-2 border-t border-[#E4E6EA]">
                        <label className="block text-xs font-bold text-[#2B2D33]">
                          Redacta tu resolución o enlace a tu trabajo:
                        </label>
                        <textarea
                          rows={4}
                          value={submissionContent}
                          onChange={(e) => setSubmissionContent(e.target.value)}
                          placeholder="Escribe tu respuesta, resolución o pega el enlace a tu documento compartido..."
                          className="w-full text-xs p-3 rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#F2412C] text-[#2B2D33]"
                        />
                        <button
                          type="button"
                          onClick={() => handleSubmitActivity(act.id)}
                          disabled={submittingActivityId === act.id}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F2412C] hover:bg-[#D93522] text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {submittingActivityId === act.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Enviando...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Entregar Actividad</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO DE LA PESTAÑA: 4. FORO DE LA UNIDAD */}
      {activeTab === 'foro' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#2B2D33]">{forum?.title || 'Foro de Debate de la Unidad'}</h3>
              <p className="text-xs text-[#555861]">
                {forum?.description || 'Espacio interactivo para debatir, plantear dudas y compartir con docentes y compañeros.'}
              </p>
            </div>
            {forum?.isClosed && (
              <span className="text-[11px] font-bold px-3 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
                Foro Cerrado
              </span>
            )}
          </div>

          {loadingForum ? (
            <div className="p-8 text-center text-xs text-[#555861] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#F2412C]" />
              <span>Cargando mensajes del foro...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Lista de mensajes */}
              <div className="space-y-3">
                {(!forum?.messages || forum.messages.length === 0) ? (
                  <div className="bg-[#F8F9FA] border border-[#D1D5DB] rounded-2xl p-8 text-center text-xs text-[#555861] space-y-2">
                    <MessageSquare className="w-8 h-8 text-[#555861] mx-auto opacity-60" />
                    <p>Aún no hay mensajes en este foro. ¡Sé el primero en iniciar la conversación!</p>
                  </div>
                ) : (
                  forum.messages.map((m) => {
                    const isTeacher = m.authorRole === 'docente' || m.authorRole === 'admin' || m.authorRole === 'superadmin';
                    return (
                      <div
                        key={m.id}
                        className={`rounded-2xl p-4 space-y-2 border shadow-xs ${
                          isTeacher
                            ? 'bg-amber-50/50 border-amber-200'
                            : 'bg-white border-[#D1D5DB]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#2B2D33]">{m.authorName}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                isTeacher
                                  ? 'bg-amber-200 text-amber-900'
                                  : 'bg-[#E4E6EA] text-[#555861]'
                              }`}
                            >
                              {isTeacher ? 'Docente' : 'Estudiante'}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#555861]">
                            {new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-[#2B2D33] leading-relaxed whitespace-pre-wrap">{m.message}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Formulario para publicar nuevo mensaje si el foro no está cerrado */}
              {!forum?.isClosed ? (
                <form onSubmit={handlePostForumMessage} className="bg-white border border-[#D1D5DB] rounded-2xl p-4 space-y-3 shadow-xs">
                  <label className="block text-xs font-bold text-[#2B2D33]">
                    Publicar una consulta o aporte en el foro:
                  </label>
                  <textarea
                    rows={3}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe tu mensaje para el docente y compañeros de clase..."
                    className="w-full text-xs p-3 rounded-xl border border-[#D1D5DB] focus:outline-none focus:border-[#F2412C] text-[#2B2D33]"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={postingMessage || !newMessage.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F2412C] hover:bg-[#D93522] text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {postingMessage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Publicando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Publicar en el Foro</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800">
                  El foro de esta unidad está cerrado para nuevas intervenciones.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO DE LA PESTAÑA: 5. EVALUACIÓN DE LA UNIDAD */}
      {activeTab === 'evaluacion' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-[#2B2D33]">
              {quiz?.title || 'Evaluación de Conocimientos'}
            </h3>
            <p className="text-xs text-[#555861]">
              {quiz?.description || 'Responde las preguntas para evaluar tu comprensión de la unidad.'}
            </p>
          </div>

          {loadingQuiz ? (
            <div className="p-8 text-center text-xs text-[#555861] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#F2412C]" />
              <span>Cargando evaluación...</span>
            </div>
          ) : !quiz ? (
            <div className="bg-[#F8F9FA] border border-[#D1D5DB] rounded-2xl p-8 text-center text-xs text-[#555861] space-y-2">
              <HelpCircle className="w-8 h-8 text-[#555861] mx-auto opacity-60" />
              <p>No se ha configurado una evaluación para esta unidad temática.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Resumen de configuración y resultados anteriores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#F8F9FA] border border-[#D1D5DB] rounded-2xl p-3.5 text-center">
                  <span className="text-[#555861] block text-[11px]">Exigencia Mínima</span>
                  <span className="text-base font-black text-[#2B2D33]">{quiz.passingScore}%</span>
                </div>
                <div className="bg-[#F8F9FA] border border-[#D1D5DB] rounded-2xl p-3.5 text-center">
                  <span className="text-[#555861] block text-[11px]">Intentos Realizados</span>
                  <span className="text-base font-black text-[#2B2D33]">
                    {quiz.myAttemptsCount} de {quiz.maxAttempts}
                  </span>
                </div>
                <div className="bg-[#F8F9FA] border border-[#D1D5DB] rounded-2xl p-3.5 text-center">
                  <span className="text-[#555861] block text-[11px]">Estado</span>
                  {quizResult?.passed ? (
                    <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aprobado ({quizResult.score}%)
                    </span>
                  ) : quizResult ? (
                    <span className="text-red-600 font-bold">No Aprobado ({quizResult.score}%)</span>
                  ) : (
                    <span className="text-[#555861] font-bold">Sin realizar</span>
                  )}
                </div>
              </div>

              {/* Si aprobó o agotó intentos */}
              {quizResult?.passed && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-center gap-3 text-emerald-950">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold">¡Has aprobado esta evaluación con {quizResult.score}%!</p>
                    <p className="text-emerald-800">Has cumplido con los objetivos pedagógicos de la unidad.</p>
                  </div>
                </div>
              )}

              {/* Preguntas del cuestionario */}
              {quiz.questions && quiz.questions.length > 0 ? (
                <div className="space-y-5">
                  {quiz.questions.map((q, idx) => (
                    <div key={q.id} className="bg-white border border-[#D1D5DB] rounded-2xl p-5 space-y-3 shadow-xs">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-lg bg-[#2B2D33] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-[#2B2D33] leading-relaxed">{q.questionText}</h4>
                          <span className="text-[10px] text-[#555861]">{q.points} punto(s)</span>
                        </div>
                      </div>

                      <div className="pl-9 space-y-2">
                        {q.options.map((opt) => {
                          const isSelected = selectedAnswers[String(q.id)] === opt.id;
                          return (
                            <label
                              key={opt.id}
                              onClick={() => setSelectedAnswers((prev) => ({ ...prev, [String(q.id)]: opt.id }))}
                              className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
                                isSelected
                                  ? 'bg-[#F2412C]/10 border-[#F2412C] text-[#2B2D33] font-semibold'
                                  : 'bg-[#F8F9FA] border-[#D1D5DB] text-[#555861] hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question_${q.id}`}
                                checked={isSelected}
                                onChange={() => setSelectedAnswers((prev) => ({ ...prev, [String(q.id)]: opt.id }))}
                                className="text-[#F2412C] focus:ring-[#F2412C]"
                              />
                              <span>{opt.optionText}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Botón de envío */}
                  {quiz.myAttemptsCount < quiz.maxAttempts && !quizResult?.passed && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleSubmitQuizAttempt}
                        disabled={submittingQuiz}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#F2412C] hover:bg-[#D93522] text-white text-xs font-black transition shadow-md shadow-[#F2412C]/20 cursor-pointer disabled:opacity-50"
                      >
                        {submittingQuiz ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Calificando...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Enviar Respuestas y Calificar</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#555861] bg-[#F8F9FA] rounded-2xl">
                  Esta evaluación aún no contiene preguntas registradas por el docente.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
