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
  Lock,
  Globe,
  Clock,
  Sparkles,
  ExternalLink,
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
    rejectionReason?: string | null;
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
  rejectionReason?: string | null;
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

/**
 * Extrae el ID de video de YouTube a partir de cualquier formato común de URL
 * (youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, o ID directo de 11 caracteres).
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

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

  // Campos del formulario de módulo
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');

  // Campos del formulario de lección
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonStatus, setLessonStatus] = useState<'draft' | 'published'>('draft');
  const [lessonVideoId, setLessonVideoId] = useState<number | null>(null);

  // Campos para Video de YouTube (V1.4)
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonVideoTitle, setLessonVideoTitle] = useState('');
  const [currentVideoData, setCurrentVideoData] = useState<{
    id: number;
    providerRef: string;
    durationSeconds: number;
    status: 'pending' | 'approved' | 'rejected';
    title: string;
    rejectionReason?: string | null;
  } | null>(null);

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
    setLessonVideoUrl('');
    setLessonVideoTitle('');
    setCurrentVideoData(null);
    setEditorMode({ type: 'new-lesson', module: mod });
  };

  // Iniciar edición de lección
  const handleStartEditLesson = (mod: ModuleItem, les: LessonItem) => {
    setLessonTitle(les.title);
    setLessonDescription(les.description || '');
    setLessonStatus(les.status);
    setLessonVideoId(les.videoId);
    if (les.video) {
      setLessonVideoUrl(`https://www.youtube.com/watch?v=${les.video.providerRef}`);
      setLessonVideoTitle(les.video.title);
      setCurrentVideoData(les.video);
    } else {
      setLessonVideoUrl('');
      setLessonVideoTitle('');
      setCurrentVideoData(null);
    }
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
  // OPERACIONES DE LECCIONES (V1.4)
  // ==========================================

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim() || lessonTitle.trim().length < 2) {
      showToast('error', 'El título de la lección debe tener al menos 2 caracteres');
      return;
    }

    setSavingAction(true);
    try {
      let finalVideoId: number | null = lessonVideoId;
      const extractedId = extractYouTubeId(lessonVideoUrl);

      // Si el docente ingresó texto pero no es un enlace válido de YouTube
      if (lessonVideoUrl.trim() && !extractedId) {
        throw new Error('Debes ingresar un enlace o ID de YouTube válido');
      }

      // Procesar registro del video en backend si hay ID de YouTube
      if (extractedId) {
        // Si el video actual en la lección ya tiene ese mismo providerRef, reutilizar su ID
        if (currentVideoData && currentVideoData.providerRef === extractedId) {
          finalVideoId = currentVideoData.id;
        } else {
          // Es un nuevo video o cambió el ID -> registrar en POST /api/videos (sin duración)
          const vRes = await api('/api/videos', {
            method: 'POST',
            body: JSON.stringify({
              title: lessonVideoTitle.trim() || lessonTitle.trim() || 'Video de Lección',
              provider: 'youtube',
              providerRef: extractedId,
            }),
          });

          const vData = await vRes.json();
          if (!vRes.ok) {
            throw new Error(vData.message || 'Error al registrar el video de YouTube');
          }
          finalVideoId = vData.id;
        }
      } else {
        finalVideoId = null;
      }

      // Validación estricta para publicación: requiere video APROBADO por administración
      if (lessonStatus === 'published') {
        if (!finalVideoId) {
          throw new Error('Para publicar una lección debes asociar un video de YouTube');
        }

        // Buscar el estado del video en los disponibles o en currentVideoData
        const vInfo =
          (currentVideoData && currentVideoData.id === finalVideoId ? currentVideoData : null) ||
          availableVideos.find((v) => v.id === finalVideoId);

        if (!vInfo || vInfo.status !== 'approved') {
          throw new Error(
            'Para publicar esta lección el video debe estar APROBADO por el administrador. Puedes guardarla como Borrador mientras se completa la revisión.'
          );
        }
      }

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
            videoId: finalVideoId || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al crear lección');

        showToast('success', `Lección "${data.title}" agregada al temario.`);
        await loadCurriculum();
        await loadVideos();
        setEditorMode({ type: 'none' });
      } else if (editorMode.type === 'edit-lesson') {
        const res = await api(`/api/lessons/${editorMode.lesson.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: lessonTitle.trim(),
            description: lessonDescription.trim() || undefined,
            status: lessonStatus,
            videoId: finalVideoId || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error al actualizar lección');

        showToast('success', `Lección "${data.title}" actualizada.`);
        await loadCurriculum();
        await loadVideos();
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

  // Detección de video actual en el editor
  const extractedYouTubeId = extractYouTubeId(lessonVideoUrl);
  const isVideoMatched =
    currentVideoData && extractedYouTubeId && currentVideoData.providerRef === extractedYouTubeId;
  const effectiveStatus = isVideoMatched
    ? currentVideoData.status
    : extractedYouTubeId
    ? 'new'
    : null;
  const effectiveDuration = isVideoMatched ? currentVideoData.durationSeconds || 0 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* BARRA SUPERIOR DE NAVEGACIÓN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#363940]">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#2B2D33] hover:bg-[#363940] text-[#B8BDC7] hover:text-white text-xs font-bold border border-[#363940] transition cursor-pointer"
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
            <p className="text-xs text-[#9EA3AC] mt-0.5">
              Curso: <span className="text-white font-bold">{course.title}</span> •{' '}
              <span className="font-mono text-[#636870]">/{course.slug}</span>
            </p>
          </div>
        </div>

        {/* Resumen de estadísticas y botón nuevo módulo */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 bg-[#2B2D33]/60 px-3 py-1.5 rounded-xl border border-[#363940] text-xs">
            <span className="text-[#9EA3AC] flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#F2412C]" />
              <b className="text-white">{modules.length}</b> módulos
            </span>
            <span className="text-[#50545C]">•</span>
            <span className="text-[#9EA3AC] flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#F2412C]" />
              <b className="text-white">{totalLessonsCount}</b> lecciones
            </span>
          </div>

          <button
            onClick={handleStartNewModule}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F2412C] hover:bg-[#F5543F] text-white text-xs font-bold shadow-lg shadow-[#F2412C]/30 transition hover:scale-[1.02] cursor-pointer"
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
              <Layers className="w-4 h-4 text-[#F2412C]" />
              <span>Estructura del Temario</span>
            </h2>
            <span className="text-[11px] text-[#636870]">
              Usa las flechas ⬆️ / ⬇️ para ordenar
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-[#2B2D33] border border-[#363940] rounded-3xl space-y-3">
              <Loader2 className="w-8 h-8 text-[#F2412C] animate-spin mx-auto" />
              <p className="text-xs text-[#9EA3AC] font-medium">Cargando temario...</p>
            </div>
          ) : modules.length === 0 ? (
            /* Estado vacío si no hay módulos */
            <div className="p-10 text-center bg-[#2B2D33]/60 border border-[#363940] rounded-3xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F2412C]/10 border border-[#F2412C]/20 text-[#F2412C] flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">No hay módulos en este curso</h3>
                <p className="text-xs text-[#9EA3AC] mt-1 max-w-sm mx-auto">
                  Estructura tu curso dividiéndolo en módulos temáticos. Luego podrás añadir lecciones en video a cada uno.
                </p>
              </div>
              <button
                onClick={handleStartNewModule}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F2412C] hover:bg-[#F5543F] text-white text-xs font-bold transition cursor-pointer"
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
                    className={`bg-[#2B2D33] border rounded-2xl transition overflow-hidden ${
                      isSelectedModule
                        ? 'border-[#F2412C] shadow-lg shadow-[#F2412C]/10 ring-1 ring-[#F2412C]/40'
                        : 'border-[#363940] hover:border-[#40444B]'
                    }`}
                  >
                    {/* CABECERA DEL MÓDULO */}
                    <div className="p-4 bg-[#1A1C20]/40 flex items-center justify-between gap-3 border-b border-[#363940]/80">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Botones de Reordenar Módulo */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={modIndex === 0}
                            onClick={() => handleMoveModule(modIndex, 'up')}
                            className="p-1 rounded hover:bg-[#363940] text-[#9EA3AC] hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                            title="Subir módulo"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={modIndex === modules.length - 1}
                            onClick={() => handleMoveModule(modIndex, 'down')}
                            className="p-1 rounded hover:bg-[#363940] text-[#9EA3AC] hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                            title="Bajar módulo"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Número de Módulo */}
                        <span className="w-7 h-7 rounded-lg bg-[#F2412C]/20 text-[#F2412C] border border-[#F2412C]/30 flex items-center justify-center text-xs font-bold shrink-0">
                          {modIndex + 1}
                        </span>

                        {/* Título de Módulo */}
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white truncate">
                            {mod.title}
                          </h3>
                          {mod.description && (
                            <p className="text-[11px] text-[#9EA3AC] line-clamp-1">
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
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F2412C]/20 hover:bg-[#F2412C] text-[#F87060] hover:text-white text-xs font-bold border border-[#F2412C]/30 transition cursor-pointer"
                          title="Añadir lección a este módulo"
                        >
                          <Plus className="w-3 h-3" />
                          <span className="hidden sm:inline">Lección</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEditModule(mod)}
                          className="p-1.5 rounded-lg bg-[#363940] hover:bg-[#40444B] text-[#B8BDC7] hover:text-white transition cursor-pointer"
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
                          className="p-1.5 rounded-lg bg-[#363940] hover:bg-rose-950 text-[#9EA3AC] hover:text-[#F2412C] transition cursor-pointer"
                          title="Borrar módulo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* LISTADO DE LECCIONES DEL MÓDULO */}
                    <div className="p-3 space-y-2">
                      {mod.lessons.length === 0 ? (
                        <div className="py-4 text-center border border-dashed border-[#363940]/80 rounded-xl">
                          <p className="text-xs text-[#636870]">
                            Sin lecciones creadas en este módulo.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleStartNewLesson(mod)}
                            className="mt-1.5 text-xs text-[#F2412C] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
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
                                  ? 'bg-[#2D1210]/40 border-[#F2412C]/60 shadow-md ring-1 ring-[#F2412C]/30'
                                  : 'bg-[#1A1C20]/60 border-[#363940]/80 hover:border-[#40444B]'
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
                                    className="p-0.5 rounded hover:bg-[#363940] text-[#9EA3AC] hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
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
                                    className="p-0.5 rounded hover:bg-[#363940] text-[#9EA3AC] hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                                    title="Bajar lección"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                </div>

                                <FileText className="w-4 h-4 text-[#9EA3AC] shrink-0" />

                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white truncate">
                                    {les.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border flex items-center gap-1 font-mono ${
                                          les.video.status === 'approved'
                                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                            : les.video.status === 'rejected'
                                            ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                                            : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                                        }`}
                                      >
                                        <Play className="w-2.5 h-2.5 text-[#F2412C]" />
                                        <span>
                                          {les.video.status === 'approved'
                                            ? `${Math.floor(les.video.durationSeconds / 60)}:${(les.video.durationSeconds % 60).toString().padStart(2, '0')}m`
                                            : les.video.status === 'rejected'
                                            ? 'Rechazado'
                                            : 'Pendiente'}
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-[#636870] italic">
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
                                  className="p-1.5 rounded-lg bg-[#363940] hover:bg-[#40444B] text-[#B8BDC7] hover:text-white transition cursor-pointer"
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
                                  className="p-1.5 rounded-lg bg-[#363940] hover:bg-rose-950 text-[#9EA3AC] hover:text-[#F2412C] transition cursor-pointer"
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
          <div className="bg-[#2B2D33] border border-[#363940] rounded-3xl p-6 shadow-xl space-y-5">
            {editorMode.type === 'none' ? (
              /* Vista predeterminada cuando nada está seleccionado */
              <div className="py-10 px-4 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F2412C]/20 to-[#C82E1C]/20 border border-[#F2412C]/30 text-[#F2412C] flex items-center justify-center mx-auto">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Panel de Edición</h3>
                  <p className="text-xs text-[#9EA3AC] mt-1 leading-relaxed">
                    Selecciona un módulo o lección a la izquierda para editar sus propiedades, o utiliza el botón para agregar nuevo contenido.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleStartNewModule}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F2412C] hover:bg-[#F5543F] text-white text-xs font-bold transition shadow-lg shadow-[#F2412C]/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Añadir Módulo</span>
                  </button>
                </div>
              </div>
            ) : editorMode.type === 'new-module' || editorMode.type === 'edit-module' ? (
              /* FORMULARIO DE MÓDULO (NUEVO O EDITAR) */
              <form onSubmit={handleSaveModule} className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-[#363940]">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#F2412C]" />
                    <h3 className="text-sm font-bold text-white">
                      {editorMode.type === 'new-module' ? 'Nuevo Módulo' : 'Editar Módulo'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditorMode({ type: 'none' })}
                    className="p-1 rounded-lg hover:bg-[#363940] text-[#9EA3AC] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#B8BDC7] block mb-1">
                    Título del Módulo *
                  </label>
                  <input
                    type="text"
                    required
                    value={moduleTitle}
                    onChange={(e) => setModuleTitle(e.target.value)}
                    placeholder="ej. Módulo 1: Introducción a la Normativa"
                    className="w-full bg-[#1A1C20] border border-[#40444B] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F2412C]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#B8BDC7] block mb-1">
                    Descripción del Módulo (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={moduleDescription}
                    onChange={(e) => setModuleDescription(e.target.value)}
                    placeholder="Describe qué competencias se desarrollarán en este módulo..."
                    className="w-full bg-[#1A1C20] border border-[#40444B] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F2412C] resize-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#363940]">
                  <button
                    type="button"
                    onClick={() => setEditorMode({ type: 'none' })}
                    disabled={savingAction}
                    className="px-4 py-2 rounded-xl bg-[#363940] hover:bg-[#40444B] text-[#B8BDC7] text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingAction}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#F2412C] hover:bg-[#F5543F] text-white text-xs font-bold shadow-lg shadow-[#F2412C]/30 transition disabled:opacity-50 cursor-pointer"
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
              /* FORMULARIO DE LECCIÓN (NUEVA O EDITAR - V1.4) */
              <form onSubmit={handleSaveLesson} className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-[#363940]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#F2412C]" />
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {editorMode.type === 'new-lesson' ? 'Nueva Lección' : 'Editar Lección'}
                      </h3>
                      <p className="text-[11px] text-[#9EA3AC]">
                        En módulo: {editorMode.module.title}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditorMode({ type: 'none' })}
                    className="p-1 rounded-lg hover:bg-[#363940] text-[#9EA3AC] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Título de la Lección */}
                <div>
                  <label className="text-xs font-bold text-[#B8BDC7] block mb-1">
                    Título de la Lección *
                  </label>
                  <input
                    type="text"
                    required
                    value={lessonTitle}
                    onChange={(e) => {
                      setLessonTitle(e.target.value);
                      if (!lessonVideoTitle) {
                        setLessonVideoTitle(e.target.value);
                      }
                    }}
                    placeholder="ej. Lección 1.1: Marco Legal y Regulación"
                    className="w-full bg-[#1A1C20] border border-[#40444B] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F2412C]"
                  />
                </div>

                {/* Descripción de la Lección */}
                <div>
                  <label className="text-xs font-bold text-[#B8BDC7] block mb-1">
                    Descripción / Notas de la Lección
                  </label>
                  <textarea
                    rows={2}
                    value={lessonDescription}
                    onChange={(e) => setLessonDescription(e.target.value)}
                    placeholder="Resumen del contenido y puntos clave a revisar..."
                    className="w-full bg-[#1A1C20] border border-[#40444B] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F2412C] resize-none"
                  />
                </div>

                {/* ======================================================== */}
                {/* SECCIÓN DE VIDEO EN LA LECCIÓN (V1.4)                     */}
                {/* ======================================================== */}
                <div className="space-y-3 bg-[#1A1C20]/80 p-4 rounded-2xl border border-[#363940]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-[#F2412C]" />
                      <span>Video de YouTube</span>
                    </label>
                    {extractedYouTubeId && (
                      <span className="text-[10px] font-mono text-[#9EA3AC] bg-[#2B2D33] px-2 py-0.5 rounded border border-[#363940]">
                        ID: {extractedYouTubeId}
                      </span>
                    )}
                  </div>

                  {/* Input para pegar enlace de YouTube */}
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        type="text"
                        value={lessonVideoUrl}
                        onChange={(e) => {
                          setLessonVideoUrl(e.target.value);
                          const newId = extractYouTubeId(e.target.value);
                          if (newId && !lessonVideoTitle) {
                            setLessonVideoTitle(lessonTitle || 'Video de Lección');
                          }
                        }}
                        placeholder="Pega un enlace de YouTube: https://www.youtube.com/watch?v=..."
                        className="w-full bg-[#2B2D33] border border-[#40444B] rounded-xl pl-3 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F2412C]"
                      />
                      {lessonVideoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setLessonVideoUrl('');
                            setLessonVideoTitle('');
                            setCurrentVideoData(null);
                            setLessonVideoId(null);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9EA3AC] hover:text-white"
                          title="Limpiar enlace"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {lessonVideoUrl.trim() && !extractedYouTubeId && (
                      <p className="text-[11px] text-rose-400 flex items-center gap-1 font-medium mt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Enlace no reconocido. Formato requerido: https://www.youtube.com/watch?v=ID o https://youtu.be/ID</span>
                      </p>
                    )}
                  </div>

                  {/* Desplegable opcional para reutilizar videos ya registrados */}
                  {availableVideos.length > 0 && (
                    <div className="pt-0.5">
                      <details className="text-[11px] text-[#9EA3AC] group">
                        <summary className="cursor-pointer hover:text-white transition list-none flex items-center gap-1 font-medium select-none">
                          <span>O elegir de videos ya registrados ({availableVideos.length})</span>
                          <ChevronDown className="w-3 h-3 group-open:rotate-180 transition" />
                        </summary>
                        <div className="mt-2 space-y-1 max-h-36 overflow-y-auto bg-[#2B2D33] p-2 rounded-xl border border-[#363940]">
                          {availableVideos.map((vid) => (
                            <button
                              key={vid.id}
                              type="button"
                              onClick={() => {
                                setLessonVideoUrl(`https://www.youtube.com/watch?v=${vid.providerRef}`);
                                setLessonVideoTitle(vid.title);
                                setLessonVideoId(vid.id);
                                setCurrentVideoData(vid);
                              }}
                              className="w-full text-left p-1.5 rounded-lg hover:bg-[#363940] text-xs flex items-center justify-between transition cursor-pointer"
                            >
                              <span className="truncate text-white font-medium">{vid.title}</span>
                              <span className="shrink-0 text-[10px] ml-2 font-mono">
                                {vid.status === 'approved' ? '✅ Aprobado' : '⏳ Pendiente'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}

                  {/* VISTA PREVIA COMPLETA CUANDO HAY UN ID DE YOUTUBE VÁLIDO */}
                  {extractedYouTubeId && (
                    <div className="space-y-3 pt-3 border-t border-[#363940] animate-fade-in">
                      {/* Título del video */}
                      <div>
                        <label className="text-[11px] font-bold text-[#B8BDC7] block mb-1">
                          Título del Video
                        </label>
                        <input
                          type="text"
                          value={lessonVideoTitle}
                          onChange={(e) => setLessonVideoTitle(e.target.value)}
                          placeholder="Título descriptivo del video..."
                          className="w-full bg-[#2B2D33] border border-[#40444B] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F2412C]"
                        />
                      </div>

                      {/* Tarjeta de Miniatura y Estado */}
                      <div className="flex flex-col sm:flex-row items-start gap-3 bg-[#2B2D33] p-3 rounded-xl border border-[#40444B]/80">
                        {/* Miniatura de YouTube */}
                        <div className="relative w-full sm:w-32 h-20 rounded-lg overflow-hidden bg-black shrink-0 border border-[#40444B]">
                          <img
                            src={`https://img.youtube.com/vi/${extractedYouTubeId}/hqdefault.jpg`}
                            alt="Miniatura YouTube"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <Play className="w-5 h-5 text-white drop-shadow-md" />
                          </div>
                        </div>

                        {/* Estado y Mensajes */}
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {effectiveStatus === 'approved' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-sm">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Aprobado</span>
                                {effectiveDuration > 0 && (
                                  <span className="ml-1 text-[10px] font-mono text-emerald-200">
                                    ({Math.floor(effectiveDuration / 60)}:{(effectiveDuration % 60).toString().padStart(2, '0')} min)
                                  </span>
                                )}
                              </span>
                            ) : effectiveStatus === 'rejected' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-950/90 text-rose-300 border border-rose-500/50 shadow-sm">
                                <AlertCircle className="w-3 h-3 text-rose-400" />
                                <span>Rechazado</span>
                              </span>
                            ) : effectiveStatus === 'pending' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-950/90 text-amber-300 border border-amber-500/50 shadow-sm">
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>Pendiente de Aprobación</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#2D1210] text-[#FAA99F] border border-[#F2412C]/40 shadow-sm">
                                <Sparkles className="w-3 h-3 text-[#F2412C]" />
                                <span>Nuevo Enlace</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-bold text-white truncate">
                            {lessonVideoTitle || lessonTitle || `Video ID: ${extractedYouTubeId}`}
                          </p>

                          {effectiveStatus === 'rejected' && currentVideoData?.rejectionReason && (
                            <p className="text-[11px] text-rose-400 bg-rose-950/40 p-1.5 rounded-lg border border-rose-500/30">
                              <b>Motivo:</b> {currentVideoData.rejectionReason}
                            </p>
                          )}

                          {effectiveStatus === 'pending' && (
                            <p className="text-[10px] text-[#9EA3AC] leading-relaxed">
                              El administrador revisará el video y fijará su duración académica antes de que la lección pueda ser publicada.
                            </p>
                          )}

                          {effectiveStatus === 'new' && (
                            <p className="text-[10px] text-[#FAA99F] leading-relaxed">
                              Al guardar la lección, este video se registrará automáticamente y quedará pendiente de aprobación por el admin.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Vista previa del reproductor interactivo */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-[#B8BDC7] flex items-center gap-1">
                          <Play className="w-3 h-3 text-[#F2412C]" /> Vista Previa del Reproductor:
                        </span>
                        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-[#40444B] shadow-lg">
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${extractedYouTubeId}`}
                            title="Vista previa del video"
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Estado de la Lección (Borrador vs Publicada) */}
                <div>
                  <label className="text-xs font-bold text-[#B8BDC7] block mb-1">
                    Estado de Publicación
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLessonStatus('draft')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        lessonStatus === 'draft'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-[#1A1C20] text-[#9EA3AC] border-[#363940] hover:bg-[#363940]'
                      }`}
                    >
                      <Lock className="w-3 h-3" />
                      <span>Borrador</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (effectiveStatus !== 'approved') {
                          showToast(
                            'info',
                            'Recuerda que para publicar la lección el video debe estar Aprobado por el Administrador'
                          );
                        }
                        setLessonStatus('published');
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        lessonStatus === 'published'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : 'bg-[#1A1C20] text-[#9EA3AC] border-[#363940] hover:bg-[#363940]'
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      <span>Publicada</span>
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#363940]">
                  <button
                    type="button"
                    onClick={() => setEditorMode({ type: 'none' })}
                    disabled={savingAction}
                    className="px-4 py-2 rounded-xl bg-[#363940] hover:bg-[#40444B] text-[#B8BDC7] text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingAction}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#F2412C] hover:bg-[#F5543F] text-white text-xs font-bold shadow-lg shadow-[#F2412C]/30 transition disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-[#1A1C20]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#2B2D33] border border-[#363940] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  ¿Eliminar {deleteConfirm.type === 'module' ? 'módulo' : 'lección'}?
                </h3>
                <p className="text-xs text-[#9EA3AC]">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-xs text-[#B8BDC7] bg-[#1A1C20] p-3 rounded-xl border border-[#363940]">
              Se eliminará:{' '}
              <span className="font-bold text-white">"{deleteConfirm.title}"</span>
              {deleteConfirm.type === 'module' &&
                ' junto con todas las lecciones que contiene.'}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl bg-[#363940] hover:bg-[#40444B] text-[#B8BDC7] text-xs font-bold transition cursor-pointer"
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
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30 cursor-pointer"
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
