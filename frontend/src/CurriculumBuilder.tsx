import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Layers,
  FileText,
  Play,
  Video,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
  Loader2,
  Eye,
  Lock,
  Globe,
  Clock,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { api } from './api';
import type { ManagedCourse } from './TeacherCoursesView';

export interface LessonItem {
  id: number;
  moduleId: number;
  title: string;
  description: string | null;
  orderIndex: number;
  status: 'draft' | 'published';
  videoId: number | null;
  video: {
    id: number;
    provider: string;
    providerRef: string;
    durationSeconds: number;
    status: 'pending' | 'approved' | 'rejected';
    title: string;
  } | null;
}

export interface ModuleItem {
  id: number;
  courseId: number;
  title: string;
  description: string | null;
  orderIndex: number;
  lessons: LessonItem[];
}

export interface VideoOption {
  id: number;
  title: string;
  provider: string;
  providerRef: string;
  durationSeconds: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface CurriculumBuilderProps {
  course: ManagedCourse;
  onBack: () => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

type EditorMode =
  | { type: 'none' }
  | { type: 'new-module' }
  | { type: 'edit-module'; module: ModuleItem }
  | { type: 'new-lesson'; module: ModuleItem }
  | { type: 'edit-lesson'; module: ModuleItem; lesson: LessonItem };

export default function CurriculumBuilder({
  course,
  onBack,
  showToast,
}: CurriculumBuilderProps) {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [availableVideos, setAvailableVideos] = useState<VideoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState(false);

  // Modo actual del editor derecho
  const [editorMode, setEditorMode] = useState<EditorMode>({ type: 'none' });

  // Campos del formulario en el editor derecho
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');

  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonStatus, setLessonStatus] = useState<'draft' | 'published'>('draft');
  const [lessonVideoId, setLessonVideoId] = useState<number | null>(null);

  // Modal de confirmación para eliminar
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'module' | 'lesson';
    id: number;
    title: string;
  } | null>(null);

  useEffect(() => {
    loadCurriculum();
    loadVideos();
  }, [course.id]);

  // Cargar temario completo desde el backend
  const loadCurriculum = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/courses/${course.id}/curriculum`);
      if (res.ok) {
        const data = await res.json();
        setModules(data.modules || []);
      } else {
        showToast('error', 'No se pudo cargar el temario del curso');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Cargar lista de videos para asignar
  const loadVideos = async () => {
    try {
      const res = await api('/api/videos');
      if (res.ok) {
        const data = await res.json();
        setAvailableVideos(data);
      }
    } catch (err) {
      console.error('Error cargando videos:', err);
    }
  };

  // Iniciar creación de nuevo módulo
  const handleStartNewModule = () => {
    setModuleTitle('');
    setModuleDescription('');
    setEditorMode({ type: 'new-module' });
  };

  // Iniciar edición de módulo
  const handleStartEditModule = (mod: ModuleItem) => {
    setModuleTitle(mod.title);
    setModuleDescription(mod.description || '');
    setEditorMode({ type: 'edit-module', module: mod });
  };

  // Iniciar creación de nueva lección en un módulo
  const handleStartNewLesson = (mod: ModuleItem) => {
    setLessonTitle('');
    setLessonDescription('');
    setLessonStatus('draft');
    setLessonVideoId(null);
    setEditorMode({ type: 'new-lesson', module: mod });
  };

  // Iniciar edición de lección
  const handleStartEditLesson = (mod: ModuleItem, les: LessonItem) => {
    setLessonTitle(les.title);
    setLessonDescription(les.description || '');
    setLessonStatus(les.status);
    setLessonVideoId(les.videoId);
    setEditorMode({ type: 'edit-lesson', module: mod, lesson: les });
  };

  // ==========================================
  // OPERACIONES DE MÓDULOS
  // ==========================================

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle.trim() || moduleTitle.trim().length < 2) {
      showToast('error', 'El título del módulo debe tener al menos 2 caracteres');
      return;
    }

    setSavingAction(true);
    try {
      if (editorMode.type === 'new-module') {
        const nextOrder = modules.length + 1;
        const res = await api(`/api/courses/${course.id}/modules`, {
          method: 'POST',
          body: JSON.stringify({
            title: moduleTitle.trim(),
            description: moduleDescription.trim() || undefined,
            orderIndex: nextOrder,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al crear módulo');

        showToast('success', `Módulo "${data.title}" creado con éxito.`);
        await loadCurriculum();
        setEditorMode({ type: 'none' });
      } else if (editorMode.type === 'edit-module') {
        const res = await api(`/api/courses/modules/${editorMode.module.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: moduleTitle.trim(),
            description: moduleDescription.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al actualizar módulo');

        showToast('success', `Módulo "${data.title}" actualizado.`);
        await loadCurriculum();
        setEditorMode({ type: 'none' });
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error al guardar el módulo');
    } finally {
      setSavingAction(false);
    }
  };

  const handleConfirmDeleteModule = async (moduleId: number) => {
    setSavingAction(true);
    try {
      const res = await api(`/api/courses/modules/${moduleId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al eliminar módulo');
      }

      showToast('success', 'Módulo eliminado.');
      setDeleteConfirm(null);
      if (
        (editorMode.type === 'edit-module' && editorMode.module.id === moduleId) ||
        (editorMode.type === 'edit-lesson' && editorMode.module.id === moduleId) ||
        (editorMode.type === 'new-lesson' && editorMode.module.id === moduleId)
      ) {
        setEditorMode({ type: 'none' });
      }
      await loadCurriculum();
    } catch (err: any) {
      showToast('error', err.message || 'No se pudo eliminar el módulo');
    } finally {
      setSavingAction(false);
    }
  };

  // Reordenar módulos (subir / bajar)
  const handleMoveModule = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const reordered = [...modules];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    // Actualización optimista de orden
    setModules(reordered);

    try {
      const moduleIds = reordered.map((m) => m.id);
      const res = await api(`/api/courses/${course.id}/modules/reorder`, {
        method: 'POST',
        body: JSON.stringify({ moduleIds }),
      });

      if (!res.ok) {
        throw new Error('Error al guardar el orden');
      }
      showToast('info', 'Orden de módulos actualizado');
    } catch (err) {
      showToast('error', 'No se pudo guardar el nuevo orden de módulos');
      await loadCurriculum();
    }
  };

  // ==========================================
  // OPERACIONES DE LECCIONES
  // ==========================================

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim() || lessonTitle.trim().length < 2) {
      showToast('error', 'El título de la lección debe tener al menos 2 caracteres');
      return;
    }

    if (lessonStatus === 'published' && !lessonVideoId) {
      showToast('error', 'Para publicar una lección debes asociar un video aprobado');
      return;
    }

    setSavingAction(true);
    try {
      if (editorMode.type === 'new-lesson') {
        const nextOrder = editorMode.module.lessons.length + 1;
        const res = await api('/api/lessons', {
          method: 'POST',
          body: JSON.stringify({
            moduleId: editorMode.module.id,
            title: lessonTitle.trim(),
            description: lessonDescription.trim() || undefined,
            orderIndex: nextOrder,
            status: lessonStatus,
            videoId: lessonVideoId || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al crear lección');

        showToast('success', `Lección "${data.title}" agregada al temario.`);
        await loadCurriculum();
        setEditorMode({ type: 'none' });
      } else if (editorMode.type === 'edit-lesson') {
        const res = await api(`/api/lessons/${editorMode.lesson.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: lessonTitle.trim(),
            description: lessonDescription.trim() || undefined,
            status: lessonStatus,
            videoId: lessonVideoId || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al actualizar lección');

        showToast('success', `Lección "${data.title}" actualizada.`);
        await loadCurriculum();
        setEditorMode({ type: 'none' });
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error al guardar la lección');
    } finally {
      setSavingAction(false);
    }
  };

  const handleConfirmDeleteLesson = async (lessonId: number) => {
    setSavingAction(true);
    try {
      const res = await api(`/api/lessons/${lessonId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al eliminar lección');
      }

      showToast('success', 'Lección eliminada.');
      setDeleteConfirm(null);
      if (editorMode.type === 'edit-lesson' && editorMode.lesson.id === lessonId) {
        setEditorMode({ type: 'none' });
      }
      await loadCurriculum();
    } catch (err: any) {
      showToast('error', err.message || 'No se pudo eliminar la lección');
    } finally {
      setSavingAction(false);
    }
  };

  // Reordenar lecciones dentro de un módulo (subir / bajar)
  const handleMoveLesson = async (
    moduleId: number,
    lessonIndex: number,
    direction: 'up' | 'down'
  ) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;

    const targetIndex = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1;
    if (targetIndex < 0 || targetIndex >= mod.lessons.length) return;

    const reorderedLessons = [...mod.lessons];
    const [moved] = reorderedLessons.splice(lessonIndex, 1);
    reorderedLessons.splice(targetIndex, 0, moved);

    // Actualización optimista
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, lessons: reorderedLessons } : m))
    );

    try {
      const lessonIds = reorderedLessons.map((l) => l.id);
      const res = await api(`/api/lessons/modules/${moduleId}/reorder`, {
        method: 'POST',
        body: JSON.stringify({ lessonIds }),
      });

      if (!res.ok) {
        throw new Error('Error al guardar el orden');
      }
      showToast('info', 'Orden de lecciones actualizado');
    } catch (err) {
      showToast('error', 'No se pudo guardar el nuevo orden de lecciones');
      await loadCurriculum();
    }
  };

  const totalLessonsCount = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* BARRA SUPERIOR DE NAVEGACIÓN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-800 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Mis Cursos</span>
          </button>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Constructor de Temario
              </h1>
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  course.status === 'published'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {course.status === 'published' ? 'Publicado' : 'Borrador'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Curso: <span className="text-white font-bold">{course.title}</span> •{' '}
              <span className="font-mono text-slate-500">/{course.slug}</span>
            </p>
          </div>
        </div>

        {/* Resumen de estadísticas y botón nuevo módulo */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <b className="text-white">{modules.length}</b> módulos
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <b className="text-white">{totalLessonsCount}</b> lecciones
            </span>
          </div>

          <button
            onClick={handleStartNewModule}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Nuevo Módulo</span>
          </button>
        </div>
      </div>

      {/* LAYOUT DE 2 COLUMNAS: TEMARIO (IZQUIERDA) Y EDITOR (DERECHA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* COLUMNA IZQUIERDA: TEMARIO (MÓDULOS Y LECCIONES)         */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Estructura del Temario</span>
            </h2>
            <span className="text-[11px] text-slate-500">
              Usa las flechas ⬆️ / ⬇️ para ordenar
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-medium">Cargando temario...</p>
            </div>
          ) : modules.length === 0 ? (
            /* Estado vacío si no hay módulos */
            <div className="p-10 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">No hay módulos en este curso</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Estructura tu curso dividiéndolo en módulos temáticos. Luego podrás añadir lecciones en video a cada uno.
                </p>
              </div>
              <button
                onClick={handleStartNewModule}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Primer Módulo</span>
              </button>
            </div>
          ) : (
            /* LISTA DE MÓDULOS */
            <div className="space-y-4">
              {modules.map((mod, modIndex) => {
                const isSelectedModule =
                  editorMode.type === 'edit-module' && editorMode.module.id === mod.id;

                return (
                  <div
                    key={mod.id}
                    className={`bg-slate-900 border rounded-2xl transition overflow-hidden ${
                      isSelectedModule
                        ? 'border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* CABECERA DEL MÓDULO */}
                    <div className="p-4 bg-slate-950/40 flex items-center justify-between gap-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Botones de Reordenar Módulo */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={modIndex === 0}
                            onClick={() => handleMoveModule(modIndex, 'up')}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                            title="Subir módulo"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={modIndex === modules.length - 1}
                            onClick={() => handleMoveModule(modIndex, 'down')}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                            title="Bajar módulo"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Número de Módulo */}
                        <span className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xs font-bold shrink-0">
                          {modIndex + 1}
                        </span>

                        {/* Título de Módulo */}
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white truncate">
                            {mod.title}
                          </h3>
                          {mod.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {mod.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Acciones de Módulo */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartNewLesson(mod)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold border border-indigo-500/30 transition cursor-pointer"
                          title="Añadir lección a este módulo"
                        >
                          <Plus className="w-3 h-3" />
                          <span className="hidden sm:inline">Lección</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEditModule(mod)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Editar módulo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirm({
                              isOpen: true,
                              type: 'module',
                              id: mod.id,
                              title: mod.title,
                            })
                          }
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                          title="Borrar módulo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* LISTADO DE LECCIONES DEL MÓDULO */}
                    <div className="p-3 space-y-2">
                      {mod.lessons.length === 0 ? (
                        <div className="py-4 text-center border border-dashed border-slate-800/80 rounded-xl">
                          <p className="text-xs text-slate-500">
                            Sin lecciones creadas en este módulo.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleStartNewLesson(mod)}
                            className="mt-1.5 text-xs text-blue-400 hover:underline font-bold inline-flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Añadir primera lección</span>
                          </button>
                        </div>
                      ) : (
                        mod.lessons.map((les, lesIndex) => {
                          const isSelectedLesson =
                            editorMode.type === 'edit-lesson' &&
                            editorMode.lesson.id === les.id;

                          return (
                            <div
                              key={les.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                                isSelectedLesson
                                  ? 'bg-blue-950/40 border-blue-500/60 shadow-md ring-1 ring-blue-500/30'
                                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {/* Flechas para reordenar lección */}
                                <div className="flex flex-col gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={lesIndex === 0}
                                    onClick={() =>
                                      handleMoveLesson(mod.id, lesIndex, 'up')
                                    }
                                    className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                                    title="Subir lección"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={lesIndex === mod.lessons.length - 1}
                                    onClick={() =>
                                      handleMoveLesson(mod.id, lesIndex, 'down')
                                    }
                                    className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                                    title="Bajar lección"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                </div>

                                <FileText className="w-4 h-4 text-slate-400 shrink-0" />

                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white truncate">
                                    {les.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span
                                      className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                                        les.status === 'published'
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      }`}
                                    >
                                      {les.status === 'published' ? 'Publicada' : 'Borrador'}
                                    </span>

                                    {les.video ? (
                                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                        <Play className="w-2.5 h-2.5 text-blue-400" />
                                        {Math.floor(les.video.durationSeconds / 60)}:
                                        {(les.video.durationSeconds % 60)
                                          .toString()
                                          .padStart(2, '0')}{' '}
                                        min
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-500 italic">
                                        Sin video
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Acciones de Lección */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditLesson(mod, les)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                                  title="Editar lección"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteConfirm({
                                      isOpen: true,
                                      type: 'lesson',
                                      id: les.id,
                                      title: les.title,
                                    })
                                  }
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                                  title="Borrar lección"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* COLUMNA DERECHA: EDITOR CONTEXTUAL                      */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 sticky top-20">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            {editorMode.type === 'none' ? (
              /* Vista predeterminada cuando nada está seleccionado */
              <div className="py-10 px-4 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Panel de Edición</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Selecciona un módulo o lección a la izquierda para editar sus propiedades, o utiliza el botón para agregar nuevo contenido.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleStartNewModule}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Añadir Módulo</span>
                  </button>
                </div>
              </div>
            ) : editorMode.type === 'new-module' || editorMode.type === 'edit-module' ? (
              /* FORMULARIO DE MÓDULO (NUEVO O EDITAR) */
              <form onSubmit={handleSaveModule} className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">
                      {editorMode.type === 'new-module' ? 'Nuevo Módulo' : 'Editar Módulo'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditorMode({ type: 'none' })}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Título del Módulo *
                  </label>
                  <input
                    type="text"
                    required
                    value={moduleTitle}
                    onChange={(e) => setModuleTitle(e.target.value)}
                    placeholder="ej. Módulo 1: Introducción a la Normativa"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Descripción del Módulo (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={moduleDescription}
                    onChange={(e) => setModuleDescription(e.target.value)}
                    placeholder="Describe qué competencias se desarrollarán en este módulo..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditorMode({ type: 'none' })}
                    disabled={savingAction}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingAction}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                  >
                    {savingAction ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {editorMode.type === 'new-module' ? 'Crear Módulo' : 'Guardar Módulo'}
                    </span>
                  </button>
                </div>
              </form>
            ) : (
              /* FORMULARIO DE LECCIÓN (NUEVA O EDITAR) */
              <form onSubmit={handleSaveLesson} className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {editorMode.type === 'new-lesson' ? 'Nueva Lección' : 'Editar Lección'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        En: {editorMode.module.title}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditorMode({ type: 'none' })}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Título de la Lección *
                  </label>
                  <input
                    type="text"
                    required
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="ej. Lección 1.1: Marco Legal Vigente"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Descripción / Notas de la Lección
                  </label>
                  <textarea
                    rows={2}
                    value={lessonDescription}
                    onChange={(e) => setLessonDescription(e.target.value)}
                    placeholder="Resumen del contenido y puntos clave a revisar..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Asignación de Video */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Video Asociado
                  </label>
                  <select
                    value={lessonVideoId || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      setLessonVideoId(val);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Sin video asociado --</option>
                    {availableVideos.map((vid) => (
                      <option key={vid.id} value={vid.id}>
                        {vid.title} ({Math.floor(vid.durationSeconds / 60)} min) -{' '}
                        {vid.status === 'approved' ? '✅ Aprobado' : '⏳ Pendiente'}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Para publicar la lección es obligatorio contar con un video con estado "Aprobado".
                  </p>
                </div>

                {/* Estado de la Lección (Borrador vs Publicada) */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Estado de Publicación
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLessonStatus('draft')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                        lessonStatus === 'draft'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <Lock className="w-3 h-3" />
                      <span>Borrador</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!lessonVideoId) {
                          showToast(
                            'info',
                            'Recuerda asociar un video aprobado para poder publicar esta lección'
                          );
                        }
                        setLessonStatus('published');
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                        lessonStatus === 'published'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      <span>Publicada</span>
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditorMode({ type: 'none' })}
                    disabled={savingAction}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingAction}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                  >
                    {savingAction ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {editorMode.type === 'new-lesson' ? 'Crear Lección' : 'Guardar Lección'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {deleteConfirm && deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  ¿Eliminar {deleteConfirm.type === 'module' ? 'módulo' : 'lección'}?
                </h3>
                <p className="text-xs text-slate-400">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
              Se eliminará:{' '}
              <span className="font-bold text-white">"{deleteConfirm.title}"</span>
              {deleteConfirm.type === 'module' &&
                ' junto con todas las lecciones que contiene.'}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm.type === 'module') {
                    handleConfirmDeleteModule(deleteConfirm.id);
                  } else {
                    handleConfirmDeleteLesson(deleteConfirm.id);
                  }
                }}
                disabled={savingAction}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30"
              >
                {savingAction ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

