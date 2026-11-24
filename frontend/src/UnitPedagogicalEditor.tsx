import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  MessageSquare,
  HelpCircle,
  Paperclip,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';
import { api } from './api';

interface UnitResource {
  id: number;
  title: string;
  type: 'pdf' | 'link' | 'image' | 'other';
  url: string;
  materialCategory: 'study' | 'complementary';
}

interface UnitActivity {
  id: number;
  title: string;
  description?: string | null;
  instructions?: string | null;
  dueDate?: string | null;
}

interface UnitForum {
  id: number;
  title: string;
  description?: string | null;
  isClosed: boolean;
  messages: Array<{
    id: number;
    authorName: string;
    authorRole: string;
    message: string;
    createdAt: string;
  }>;
}

interface QuizOptionInput {
  optionText: string;
  isCorrect: boolean;
}

interface QuizQuestionInput {
  questionText: string;
  questionType: 'multiple_choice';
  points: number;
  options: QuizOptionInput[];
}

interface UnitPedagogicalEditorProps {
  lessonId: number;
  initialStudyUrl?: string | null;
  initialStudyContent?: string | null;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
  onUpdated?: () => void;
}

type TabType = 'study' | 'resources' | 'activity' | 'forum' | 'quiz';

export default function UnitPedagogicalEditor({
  lessonId,
  initialStudyUrl,
  initialStudyContent,
  showToast,
  onUpdated,
}: UnitPedagogicalEditorProps) {
  const [tab, setTab] = useState<TabType>('study');

  // 1. Material de estudio
  const [studyUrl, setStudyUrl] = useState(initialStudyUrl || '');
  const [studyContent, setStudyContent] = useState(initialStudyContent || '');
  const [savingStudy, setSavingStudy] = useState(false);

  // 2. Recursos complementarios
  const [resources, setResources] = useState<UnitResource[]>([]);
  const [resTitle, setResTitle] = useState('');
  const [resType, setResType] = useState<'pdf' | 'link' | 'image' | 'other'>('link');
  const [resUrl, setResUrl] = useState('');
  const [resCategory, setResCategory] = useState<'study' | 'complementary'>('complementary');
  const [loadingResources, setLoadingResources] = useState(false);
  const [addingResource, setAddingResource] = useState(false);

  // 3. Actividades
  const [activities, setActivities] = useState<UnitActivity[]>([]);
  const [actTitle, setActTitle] = useState('');
  const [actDescription, setActDescription] = useState('');
  const [actInstructions, setActInstructions] = useState('');
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);

  // 4. Foro
  const [forum, setForum] = useState<UnitForum | null>(null);
  const [forumTitle, setForumTitle] = useState('');
  const [forumDescription, setForumDescription] = useState('');
  const [forumIsClosed, setForumIsClosed] = useState(false);
  const [savingForum, setSavingForum] = useState(false);
  const [loadingForum, setLoadingForum] = useState(false);

  // 5. Evaluación / Cuestionario
  const [quizTitle, setQuizTitle] = useState('Evaluación de la Unidad');
  const [quizPassingScore, setQuizPassingScore] = useState(70);
  const [quizMaxAttempts, setQuizMaxAttempts] = useState(3);
  const [questions, setQuestions] = useState<QuizQuestionInput[]>([
    {
      questionText: '¿Cuál es el concepto principal abordado en esta unidad?',
      questionType: 'multiple_choice',
      points: 1,
      options: [
        { optionText: 'Opción A (Respuesta de ejemplo)', isCorrect: true },
        { optionText: 'Opción B (Distractor)', isCorrect: false },
      ],
    },
  ]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);

  useEffect(() => {
    setStudyUrl(initialStudyUrl || '');
    setStudyContent(initialStudyContent || '');
  }, [initialStudyUrl, initialStudyContent]);

  useEffect(() => {
    if (tab === 'resources') loadResources();
    if (tab === 'activity') loadActivities();
    if (tab === 'forum') loadForum();
    if (tab === 'quiz') loadQuiz();
  }, [lessonId, tab]);

  // ==========================================
  // HANDLERS: MATERIAL DE ESTUDIO
  // ==========================================
  const handleSaveStudy = async () => {
    setSavingStudy(true);
    try {
      const res = await api(`/api/units/${lessonId}/study-material`, {
        method: 'PATCH',
        body: JSON.stringify({
          studyMaterialUrl: studyUrl.trim() || null,
          studyMaterialContent: studyContent.trim() || null,
        }),
      });
      if (res.ok) {
        showToast('success', 'Material de estudio guardado con éxito');
        onUpdated?.();
      } else {
        const data = await res.json();
        showToast('error', data.message || 'Error al guardar material de estudio');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error al conectar con el servidor');
    } finally {
      setSavingStudy(false);
    }
  };

  // ==========================================
  // HANDLERS: RECURSOS
  // ==========================================
  const loadResources = async () => {
    setLoadingResources(true);
    try {
      const res = await api(`/api/units/${lessonId}/resources`);
      if (res.ok) {
        const data = await res.json();
        setResources(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingResources(false);
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle.trim() || !resUrl.trim()) {
      showToast('error', 'Por favor ingresa título y URL del recurso.');
      return;
    }
    setAddingResource(true);
    try {
      const res = await api(`/api/units/${lessonId}/resources`, {
        method: 'POST',
        body: JSON.stringify({
          title: resTitle.trim(),
          type: resType,
          url: resUrl.trim(),
          materialCategory: resCategory,
        }),
      });
      if (res.ok) {
        showToast('success', 'Recurso añadido.');
        setResTitle('');
        setResUrl('');
        loadResources();
      } else {
        const data = await res.json();
        showToast('error', data.message || 'Error al guardar recurso');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error al conectar');
    } finally {
      setAddingResource(false);
    }
  };

  const handleDeleteResource = async (id: number) => {
    try {
      const res = await api(`/api/units/resources/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('success', 'Recurso eliminado');
        loadResources();
      } else {
        showToast('error', 'No se pudo eliminar el recurso');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // HANDLERS: ACTIVIDADES
  // ==========================================
  const loadActivities = async () => {
    setLoadingActivities(true);
    try {
      const res = await api(`/api/units/${lessonId}/activities`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim()) {
      showToast('error', 'El título de la actividad es requerido.');
      return;
    }
    setSavingActivity(true);
    try {
      const res = await api(`/api/units/${lessonId}/activities`, {
        method: 'POST',
        body: JSON.stringify({
          title: actTitle.trim(),
          description: actDescription.trim() || undefined,
          instructions: actInstructions.trim() || undefined,
        }),
      });
      if (res.ok) {
        showToast('success', 'Actividad registrada.');
        setActTitle('');
        setActDescription('');
        setActInstructions('');
        loadActivities();
      } else {
        const data = await res.json();
        showToast('error', data.message || 'Error al registrar actividad');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error al guardar actividad');
    } finally {
      setSavingActivity(false);
    }
  };

  // ==========================================
  // HANDLERS: FORO
  // ==========================================
  const loadForum = async () => {
    setLoadingForum(true);
    try {
      const res = await api(`/api/units/${lessonId}/forum`);
      if (res.ok) {
        const data = await res.json();
        setForum(data);
        setForumTitle(data.title || '');
        setForumDescription(data.description || '');
        setForumIsClosed(Boolean(data.isClosed));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingForum(false);
    }
  };

  const handleSaveForumConfig = async () => {
    setSavingForum(true);
    try {
      const res = await api(`/api/units/${lessonId}/forum/config`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: forumTitle.trim() || undefined,
          description: forumDescription.trim() || undefined,
          isClosed: forumIsClosed,
        }),
      });
      if (res.ok) {
        showToast('success', 'Configuración del foro guardada.');
        loadForum();
      } else {
        const data = await res.json();
        showToast('error', data.message || 'Error al actualizar foro');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error al guardar configuración');
    } finally {
      setSavingForum(false);
    }
  };

  // ==========================================
  // HANDLERS: EVALUACIÓN
  // ==========================================
  const loadQuiz = async () => {
    setLoadingQuiz(true);
    try {
      const res = await api(`/api/units/${lessonId}/quiz`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          setQuizTitle(data.title || 'Evaluación de la Unidad');
          setQuizPassingScore(data.passingScore || 70);
          setQuizMaxAttempts(data.maxAttempts || 3);
          if (data.questions && data.questions.length > 0) {
            setQuestions(
              data.questions.map((q: any) => ({
                questionText: q.questionText,
                questionType: 'multiple_choice',
                points: q.points || 1,
                options: (q.options || []).map((opt: any) => ({
                  optionText: opt.optionText,
                  isCorrect: Boolean(opt.isCorrect),
                })),
              })),
            );
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: '',
        questionType: 'multiple_choice',
        points: 1,
        options: [
          { optionText: 'Opción 1', isCorrect: true },
          { optionText: 'Opción 2', isCorrect: false },
        ],
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleAddOption = (qIdx: number) => {
    const updated = [...questions];
    updated[qIdx].options.push({
      optionText: `Nueva opción`,
      isCorrect: false,
    });
    setQuestions(updated);
  };

  const handleRemoveOption = (qIdx: number, optIdx: number) => {
    const updated = [...questions];
    updated[qIdx].options = updated[qIdx].options.filter((_, i) => i !== optIdx);
    setQuestions(updated);
  };

  const handleSetCorrectOption = (qIdx: number, optIdx: number) => {
    const updated = [...questions];
    updated[qIdx].options = updated[qIdx].options.map((opt, i) => ({
      ...opt,
      isCorrect: i === optIdx,
    }));
    setQuestions(updated);
  };

  const handleSaveQuiz = async () => {
    if (!quizTitle.trim()) {
      showToast('error', 'El título de la evaluación es obligatorio');
      return;
    }
    if (questions.length === 0) {
      showToast('error', 'Debes incluir al menos una pregunta en la evaluación');
      return;
    }
    for (const q of questions) {
      if (!q.questionText.trim()) {
        showToast('error', 'Todas las preguntas deben tener texto');
        return;
      }
      if (q.options.length < 2) {
        showToast('error', 'Cada pregunta debe tener al menos 2 opciones de respuesta');
        return;
      }
      if (!q.options.some((o) => o.isCorrect)) {
        showToast('error', `Selecciona cuál es la opción correcta para: "${q.questionText}"`);
        return;
      }
    }

    setSavingQuiz(true);
    try {
      const res = await api(`/api/units/${lessonId}/quiz`, {
        method: 'POST',
        body: JSON.stringify({
          title: quizTitle.trim(),
          passingScore: Number(quizPassingScore),
          maxAttempts: Number(quizMaxAttempts),
          questions,
        }),
      });
      if (res.ok) {
        showToast('success', '¡Evaluación configurada y guardada!');
        loadQuiz();
      } else {
        const data = await res.json();
        showToast('error', data.message || 'Error al guardar evaluación');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error de conexión');
    } finally {
      setSavingQuiz(false);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-[#D1D5DB]">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-wider text-[#2B2D33] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#F2412C]" />
          Componentes Pedagógicos de la Unidad
        </h4>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex flex-wrap gap-1 bg-[#F8F9FA] p-1 rounded-xl border border-[#D1D5DB]">
        <button
          type="button"
          onClick={() => setTab('study')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            tab === 'study' ? 'bg-[#F2412C] text-white shadow-xs' : 'text-[#555861] hover:text-[#2B2D33]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>1. Estudio</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('resources')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            tab === 'resources' ? 'bg-[#F2412C] text-white shadow-xs' : 'text-[#555861] hover:text-[#2B2D33]'
          }`}
        >
          <Paperclip className="w-3.5 h-3.5" />
          <span>2. Complementario</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('activity')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            tab === 'activity' ? 'bg-[#F2412C] text-white shadow-xs' : 'text-[#555861] hover:text-[#2B2D33]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>3. Actividad</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('forum')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            tab === 'forum' ? 'bg-[#F2412C] text-white shadow-xs' : 'text-[#555861] hover:text-[#2B2D33]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>4. Foro</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('quiz')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            tab === 'quiz' ? 'bg-[#F2412C] text-white shadow-xs' : 'text-[#555861] hover:text-[#2B2D33]'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>5. Evaluación</span>
        </button>
      </div>

      {/* PESTAÑA 1: MATERIAL DE ESTUDIO (LINK A CLASES/VIDEOS + RESUMEN) */}
      {tab === 'study' && (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-[#D1D5DB] text-xs">
          <div>
            <label className="block font-bold text-[#2B2D33] mb-1">
              Enlace / URL al Módulo de Clases o Videos:
            </label>
            <p className="text-[11px] text-[#555861] mb-2">
              Ingresa el enlace que dirigirá al estudiante a la clase grabada, videoconferencia o repositorio oficial.
            </p>
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-[#555861]" />
              <input
                type="url"
                value={studyUrl}
                onChange={(e) => setStudyUrl(e.target.value)}
                placeholder="https://clases.ejemplo.com/modulo1/sesion2"
                className="flex-1 p-2.5 rounded-lg border border-[#D1D5DB] focus:outline-none focus:border-[#F2412C] text-[#2B2D33]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#2B2D33] mb-1">
              Guía, Apuntes o Resumen Escrito de la Unidad:
            </label>
            <textarea
              rows={4}
              value={studyContent}
              onChange={(e) => setStudyContent(e.target.value)}
              placeholder="Escribe los conceptos clave, resumen o bibliografía obligatoria para esta unidad..."
              className="w-full p-2.5 rounded-lg border border-[#D1D5DB] focus:outline-none focus:border-[#F2412C] text-[#2B2D33]"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveStudy}
            disabled={savingStudy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F2412C] hover:bg-[#D93522] text-white font-bold transition cursor-pointer disabled:opacity-50"
          >
            {savingStudy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Guardar Material de Estudio</span>
          </button>
        </div>
      )}

      {/* PESTAÑA 2: MATERIAL COMPLEMENTARIO */}
      {tab === 'resources' && (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-[#D1D5DB] text-xs">
          <form onSubmit={handleAddResource} className="space-y-3 bg-[#F8F9FA] p-3 rounded-xl border border-[#E4E6EA]">
            <span className="font-bold text-[#2B2D33] block">Añadir Recurso Complementario</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Título del documento o enlace"
                value={resTitle}
                onChange={(e) => setResTitle(e.target.value)}
                className="p-2 rounded-lg border border-[#D1D5DB] text-[#2B2D33] text-xs col-span-2"
              />
              <select
                value={resType}
                onChange={(e) => setResType(e.target.value as any)}
                className="p-2 rounded-lg border border-[#D1D5DB] text-[#2B2D33] text-xs"
              >
                <option value="link">Enlace Web</option>
                <option value="pdf">Documento PDF</option>
                <option value="image">Imagen / Esquema</option>
                <option value="other">Otro Formato</option>
              </select>
            </div>
            <input
              type="url"
              placeholder="https://ejemplo.com/lectura-adicional.pdf"
              value={resUrl}
              onChange={(e) => setResUrl(e.target.value)}
              className="w-full p-2 rounded-lg border border-[#D1D5DB] text-[#2B2D33] text-xs"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={addingResource}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2B2D33] hover:bg-black text-white font-bold cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Recurso</span>
              </button>
            </div>
          </form>

          {/* Lista de recursos cargados */}
          <div className="space-y-2">
            {loadingResources ? (
              <p className="text-center text-[#555861] py-3">Cargando recursos...</p>
            ) : resources.length === 0 ? (
              <p className="text-center text-[#555861] py-3">No hay recursos complementarios añadidos.</p>
            ) : (
              resources.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-[#E4E6EA] bg-[#F8F9FA]"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Paperclip className="w-3.5 h-3.5 text-[#F2412C] shrink-0" />
                    <span className="font-bold text-[#2B2D33] truncate">{r.title}</span>
                    <span className="text-[10px] uppercase font-mono text-[#555861]">({r.type})</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#555861] hover:text-[#2B2D33] p-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteResource(r.id)}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: ACTIVIDADES PRÁCTICAS */}
      {tab === 'activity' && (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-[#D1D5DB] text-xs">
          <form onSubmit={handleSaveActivity} className="space-y-3 bg-[#F8F9FA] p-3 rounded-xl border border-[#E4E6EA]">
            <span className="font-bold text-[#2B2D33] block">Crear Nueva Actividad Práctica</span>
            <input
              type="text"
              placeholder="Título de la actividad (ej. Taller Práctico N° 1)"
              value={actTitle}
              onChange={(e) => setActTitle(e.target.value)}
              className="w-full p-2 rounded-lg border border-[#D1D5DB] text-[#2B2D33] text-xs"
            />
            <input
              type="text"
              placeholder="Breve descripción o propósito"
              value={actDescription}
              onChange={(e) => setActDescription(e.target.value)}
              className="w-full p-2 rounded-lg border border-[#D1D5DB] text-[#2B2D33] text-xs"
            />
            <textarea
              rows={3}
              placeholder="Instrucciones detalladas de entrega y formato..."
              value={actInstructions}
              onChange={(e) => setActInstructions(e.target.value)}
              className="w-full p-2 rounded-lg border border-[#D1D5DB] text-[#2B2D33] text-xs"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingActivity}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F2412C] hover:bg-[#D93522] text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {savingActivity ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Guardar Actividad</span>
              </button>
            </div>
          </form>

          {/* Actividades existentes */}
          <div className="space-y-2">
            {loadingActivities ? (
              <p className="text-center text-[#555861] py-3">Cargando actividades...</p>
            ) : activities.length === 0 ? (
              <p className="text-center text-[#555861] py-3">No hay actividades creadas en esta unidad.</p>
            ) : (
              activities.map((a) => (
                <div key={a.id} className="p-3 rounded-lg border border-[#D1D5DB] bg-[#F8F9FA] space-y-1">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-[#2B2D33]">{a.title}</h5>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                      Actividad
                    </span>
                  </div>
                  {a.description && <p className="text-[#555861] text-[11px]">{a.description}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 4: FORO DE LA UNIDAD */}
      {tab === 'forum' && (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-[#D1D5DB] text-xs">
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-[#2B2D33] mb-1">Título del Foro:</label>
              <input
                type="text"
                value={forumTitle}
                onChange={(e) => setForumTitle(e.target.value)}
                placeholder="Foro de la Unidad"
                className="w-full p-2 rounded-lg border border-[#D1D5DB] text-[#2B2D33]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2B2D33] mb-1">Descripción o Consigna del Foro:</label>
              <textarea
                rows={3}
                value={forumDescription}
                onChange={(e) => setForumDescription(e.target.value)}
                placeholder="Espacio para dudas, consultas y debate del temario..."
                className="w-full p-2 rounded-lg border border-[#D1D5DB] text-[#2B2D33]"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8F9FA] border border-[#E4E6EA]">
              <div>
                <span className="font-bold text-[#2B2D33] block">Estado del Foro</span>
                <span className="text-[11px] text-[#555861]">
                  {forumIsClosed ? 'Cerrado para nuevas respuestas' : 'Abierto a la participación'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setForumIsClosed(!forumIsClosed)}
                className="cursor-pointer"
              >
                {forumIsClosed ? (
                  <ToggleRight className="w-7 h-7 text-amber-600" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-emerald-600" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveForumConfig}
              disabled={savingForum}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F2412C] hover:bg-[#D93522] text-white font-bold cursor-pointer disabled:opacity-50"
            >
              {savingForum ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Guardar Configuración del Foro</span>
            </button>
          </div>
        </div>
      )}

      {/* PESTAÑA 5: EVALUACIÓN / CUESTIONARIO */}
      {tab === 'quiz' && (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-[#D1D5DB] text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="col-span-1 sm:col-span-1">
              <label className="block font-bold text-[#2B2D33] mb-1">Título de la Evaluación:</label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full p-2 rounded-lg border border-[#D1D5DB] text-[#2B2D33]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2B2D33] mb-1">Porcentaje de Aprobación (%):</label>
              <input
                type="number"
                min={1}
                max={100}
                value={quizPassingScore}
                onChange={(e) => setQuizPassingScore(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-[#D1D5DB] text-[#2B2D33]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2B2D33] mb-1">Intentos Máximos:</label>
              <input
                type="number"
                min={1}
                max={10}
                value={quizMaxAttempts}
                onChange={(e) => setQuizMaxAttempts(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-[#D1D5DB] text-[#2B2D33]"
              />
            </div>
          </div>

          {/* Editor de Preguntas */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#2B2D33]">Preguntas de la Evaluación ({questions.length})</span>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2B2D33] hover:bg-black text-white text-[11px] font-bold cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Añadir Pregunta</span>
              </button>
            </div>

            {questions.map((q, qIdx) => (
              <div key={qIdx} className="p-3 rounded-xl border border-[#D1D5DB] bg-[#F8F9FA] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#2B2D33]">Pregunta #{qIdx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIdx)}
                    className="text-red-500 hover:text-red-700 cursor-pointer p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Escribe el enunciado de la pregunta..."
                  value={q.questionText}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[qIdx].questionText = e.target.value;
                    setQuestions(updated);
                  }}
                  className="w-full p-2 rounded-lg border border-[#D1D5DB] text-[#2B2D33] bg-white text-xs"
                />

                {/* Opciones */}
                <div className="pl-4 space-y-1.5 pt-1">
                  <span className="text-[10px] text-[#555861] uppercase font-bold">
                    Opciones (marca el círculo de la respuesta correcta):
                  </span>
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct_q_${qIdx}`}
                        checked={opt.isCorrect}
                        onChange={() => handleSetCorrectOption(qIdx, optIdx)}
                        className="text-[#F2412C] focus:ring-[#F2412C] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={opt.optionText}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[qIdx].options[optIdx].optionText = e.target.value;
                          setQuestions(updated);
                        }}
                        className="flex-1 p-1.5 rounded-lg border border-[#D1D5DB] text-[#2B2D33] bg-white text-xs"
                      />
                      {q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(qIdx, optIdx)}
                          className="text-gray-400 hover:text-red-500 cursor-pointer p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddOption(qIdx)}
                    className="text-[11px] text-[#F2412C] hover:underline font-bold pt-1 cursor-pointer"
                  >
                    + Añadir otra opción
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveQuiz}
              disabled={savingQuiz}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F2412C] hover:bg-[#D93522] text-white font-bold transition cursor-pointer disabled:opacity-50"
            >
              {savingQuiz ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Guardar Evaluación Completa</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
