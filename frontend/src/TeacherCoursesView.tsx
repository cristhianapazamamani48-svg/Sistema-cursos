import { useState, useEffect } from 'react';
import {
  BookOpen,
  Layers,
  FileText,
  Plus,
  Edit3,
  Globe,
  EyeOff,
  Eye,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  X,
  Sparkles,
  Loader2,
  ExternalLink,
  GraduationCap,
  Image as ImageIcon,
} from 'lucide-react';
import { api } from './api';

export interface ManagedCourse {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  price: string;
  currency: 'BOB' | 'USD';
  status: 'draft' | 'published' | 'archived';
  minWatchPercentage: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  modulesCount: number;
  lessonsCount: number;
}

interface TeacherCoursesViewProps {
  currentUser: {
    id: number;
    email: string;
    fullName: string;
    role: string;
  };
  onViewAsStudent: (slug: string) => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export default function TeacherCoursesView({
  currentUser,
  onViewAsStudent,
  showToast,
}: TeacherCoursesViewProps) {
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  // Modal Crear Curso
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [price, setPrice] = useState('0');
  const [currency, setCurrency] = useState<'BOB' | 'USD'>('BOB');
  const [minWatchPercentage, setMinWatchPercentage] = useState(85);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [autoSlug, setAutoSlug] = useState(true);

  // Modal Editar Curso
  const [editingCourse, setEditingCourse] = useState<ManagedCourse | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');
  const [editPrice, setEditPrice] = useState('0');
  const [editCurrency, setEditCurrency] = useState<'BOB' | 'USD'>('BOB');
  const [editMinWatchPercentage, setEditMinWatchPercentage] = useState(85);
  const [editStatus, setEditStatus] = useState<'draft' | 'published' | 'archived'>('draft');

  // Sección agregar módulo en modal de edición
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDescription, setNewModuleDescription] = useState('');
  const [addingModule, setAddingModule] = useState(false);

  // Estados de carga
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingStatusId, setTogglingStatusId] = useState<number | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await api('/api/courses/teacher/my-courses');
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      } else {
        showToast('error', 'No se pudieron cargar tus cursos');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Generador de slug a partir del título
  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (autoSlug) {
      setSlug(slugify(val));
    }
  };

  // Crear nuevo curso
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      showToast('error', 'El título y el slug son obligatorios');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api('/api/courses', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          thumbnailUrl: thumbnailUrl.trim() || undefined,
          price: Number(price) || 0,
          currency,
          minWatchPercentage: Number(minWatchPercentage) || 85,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al crear el curso');
      }

      showToast('success', `¡Curso "${data.title}" creado con éxito!`);
      setCreateModalOpen(false);
      resetCreateForm();
      await loadCourses();
    } catch (err: any) {
      showToast('error', err.message || 'Error al crear curso');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setTitle('');
    setSlug('');
    setDescription('');
    setThumbnailUrl('');
    setPrice('0');
    setCurrency('BOB');
    setMinWatchPercentage(85);
    setStatus('draft');
    setAutoSlug(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = (course: ManagedCourse) => {
    setEditingCourse(course);
    setEditTitle(course.title);
    setEditSlug(course.slug);
    setEditDescription(course.description || '');
    setEditThumbnailUrl(course.thumbnailUrl || '');
    setEditPrice(String(course.price));
    setEditCurrency(course.currency);
    setEditMinWatchPercentage(course.minWatchPercentage);
    setEditStatus(course.status);
    setNewModuleTitle('');
    setNewModuleDescription('');
  };

  // Guardar edición de curso
  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    setIsSubmitting(true);
    try {
      const res = await api(`/api/courses/${editingCourse.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle.trim(),
          slug: editSlug.trim(),
          description: editDescription.trim() || undefined,
          thumbnailUrl: editThumbnailUrl.trim() || undefined,
          price: Number(editPrice) || 0,
          currency: editCurrency,
          minWatchPercentage: Number(editMinWatchPercentage) || 85,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al actualizar el curso');
      }

      showToast('success', `¡Curso "${data.title}" actualizado con éxito!`);
      setEditingCourse(null);
      await loadCourses();
    } catch (err: any) {
      showToast('error', err.message || 'Error al actualizar curso');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cambiar estado publicado / borrador con un solo clic
  const handleToggleStatus = async (course: ManagedCourse) => {
    const nextStatus = course.status === 'published' ? 'draft' : 'published';
    setTogglingStatusId(course.id);
    try {
      const res = await api(`/api/courses/${course.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al cambiar estado');
      }

      showToast(
        'success',
        nextStatus === 'published'
          ? `El curso "${course.title}" ahora está Publicado.`
          : `El curso "${course.title}" se cambió a Borrador.`
      );

      // Actualizar estado local
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, status: nextStatus } : c))
      );
    } catch (err: any) {
      showToast('error', err.message || 'No se pudo cambiar el estado');
    } finally {
      setTogglingStatusId(null);
    }
  };

  // Agregar módulo rápidamente desde modal de edición
  const handleAddModule = async () => {
    if (!editingCourse || !newModuleTitle.trim()) {
      showToast('error', 'Ingresa un título para el módulo');
      return;
    }

    setAddingModule(true);
    try {
      const nextOrder = (editingCourse.modulesCount || 0) + 1;
      const res = await api(`/api/courses/${editingCourse.id}/modules`, {
        method: 'POST',
        body: JSON.stringify({
          title: newModuleTitle.trim(),
          description: newModuleDescription.trim() || undefined,
          orderIndex: nextOrder,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al crear módulo');
      }

      showToast('success', `Módulo "${data.title}" añadido correctamente.`);
      setNewModuleTitle('');
      setNewModuleDescription('');
      setEditingCourse({
        ...editingCourse,
        modulesCount: (editingCourse.modulesCount || 0) + 1,
      });
      await loadCourses();
    } catch (err: any) {
      showToast('error', err.message || 'No se pudo añadir el módulo');
    } finally {
      setAddingModule(false);
    }
  };

  // Filtrado de cursos
  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && c.status === statusFilter;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Mis Cursos
            </h1>
            <span className="text-xs uppercase font-extrabold px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {currentUser.role === 'docente' ? 'Panel Docente' : 'Panel Administrador'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gestiona tus programas educativos, revisa módulos y lecciones, y publica contenidos para tus estudiantes.
          </p>
        </div>

        {/* Botón Destacado: + Nuevo curso */}
        <button
          onClick={() => {
            resetCreateForm();
            setCreateModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer shrink-0"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>+ Nuevo curso</span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        {/* Input de Búsqueda */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, temática o slug..."
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros por Estado */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-bold text-slate-400 px-1 hidden lg:inline-flex items-center gap-1">
            <Filter className="w-3 h-3" /> Estado:
          </span>
          {(['all', 'published', 'draft'] as const).map((st) => {
            const count =
              st === 'all'
                ? courses.length
                : courses.filter((c) => c.status === st).length;
            const label =
              st === 'all'
                ? 'Todos'
                : st === 'published'
                ? 'Publicados'
                : 'Borradores';

            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    statusFilter === st
                      ? 'bg-blue-800 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Spinner de Carga */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Cargando tus cursos...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        /* ESTADO VACÍO CON ILUSTRACIÓN Y MENSAJE */
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/80 rounded-3xl p-8 sm:p-14 text-center max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
          {/* Fondo difuminado estético */}
          <div className="absolute -top-24 -left-24 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Ilustración SVG Estilizada */}
          <div className="relative mx-auto w-36 h-36 mb-6 flex items-center justify-center">
            <svg
              className="w-full h-full drop-shadow-[0_15px_25px_rgba(37,99,235,0.25)]"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Círculo de fondo con aura */}
              <circle cx="100" cy="100" r="85" fill="url(#circleGrad)" fillOpacity="0.15" />
              <circle cx="100" cy="100" r="75" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.4" />

              {/* Pizarra o soporte */}
              <rect x="45" y="45" width="110" height="85" rx="14" fill="#0f172a" stroke="#1e293b" strokeWidth="2.5" />
              <rect x="52" y="52" width="96" height="71" rx="9" fill="#020617" />

              {/* Elementos dentro de la pizarra: lecciones y módulos */}
              <rect x="62" y="66" width="45" height="6" rx="3" fill="#3b82f6" />
              <rect x="62" y="78" width="76" height="4" rx="2" fill="#475569" fillOpacity="0.7" />
              <rect x="62" y="87" width="60" height="4" rx="2" fill="#334155" fillOpacity="0.7" />
              
              {/* Botón play en miniatura */}
              <circle cx="125" cy="69" r="8" fill="#10b981" fillOpacity="0.25" stroke="#10b981" strokeWidth="1.2" />
              <polygon points="123,66 128,69 123,72" fill="#34d399" />

              {/* Libro flotante frontal */}
              <path
                d="M60 145C72 138 88 138 100 143C112 138 128 138 140 145V168C128 161 112 161 100 166C88 161 72 161 60 168V145Z"
                fill="url(#bookGrad)"
                stroke="#6366f1"
                strokeWidth="2"
              />
              <path d="M100 143V166" stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round" />

              {/* Chispas y estrellas */}
              <path
                d="M152 40L154 46L160 48L154 50L152 56L150 50L144 48L150 46L152 40Z"
                fill="#fbbf24"
              />
              <circle cx="48" cy="115" r="3.5" fill="#60a5fa" />
              <circle cx="156" cy="120" r="2.5" fill="#a78bfa" />

              <defs>
                <linearGradient id="circleGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3b82f6" />
                  <stop offset="1" stopColor="#818cf8" />
                </linearGradient>
                <linearGradient id="bookGrad" x1="60" y1="138" x2="140" y2="168" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4338ca" />
                  <stop offset="1" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Mensajes del Estado Vacío */}
          {searchQuery || statusFilter !== 'all' ? (
            <div className="space-y-3 relative z-10">
              <h3 className="text-xl font-bold text-white">No se encontraron cursos coincidentes</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                No hay cursos que coincidan con tus términos de búsqueda o filtros seleccionados.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
                >
                  Restablecer filtros
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 relative z-10">
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Aún no tienes cursos en tu catálogo
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Comienza creando tu primer curso institucional. Podrás estructurarlo en módulos, añadir lecciones con videos interactivos y publicar cuando esté listo.
              </p>
              <div className="pt-4">
                <button
                  onClick={() => {
                    resetCreateForm();
                    setCreateModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 hover:scale-105 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Crear mi primer curso</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* GRILLA DE TARJETAS DE CURSOS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const isPublished = course.status === 'published';
            const isDraft = course.status === 'draft';
            const isToggling = togglingStatusId === course.id;

            return (
              <div
                key={course.id}
                className="group bg-slate-900 border border-slate-800/90 hover:border-slate-700 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-blue-500/5 transition flex flex-col justify-between"
              >
                <div>
                  {/* Portada / Thumbnail con Badges Superpuestos */}
                  <div className="relative h-48 w-full bg-slate-950 overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        onError={(e) => {
                          // Si falla la imagen, ocultamos el elemento para mostrar el banner por defecto
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/60 flex flex-col items-center justify-center p-6 text-center border-b border-slate-800">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2 group-hover:scale-110 transition">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 line-clamp-1 max-w-[200px]">
                          {course.slug}
                        </span>
                      </div>
                    )}

                    {/* Overlay suave para legibilidad */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none opacity-80" />

                    {/* Badge de Estado: Borrador / Publicado */}
                    <div className="absolute top-3 left-3">
                      {isPublished ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-black/40">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Publicado
                        </span>
                      ) : isDraft ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-950/90 text-amber-300 border border-amber-500/40 shadow-lg shadow-black/40">
                          <EyeOff className="w-3 h-3 text-amber-400" />
                          Borrador
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-950/90 text-purple-300 border border-purple-500/40 shadow-lg shadow-black/40">
                          Archivado
                        </span>
                      )}
                    </div>

                    {/* Badge de Precio / Gratis */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-slate-950/90 text-white border border-slate-700/80 shadow-lg">
                        {Number(course.price) === 0
                          ? 'GRATIS'
                          : `${course.price} ${course.currency}`}
                      </span>
                    </div>

                    {/* Badge Requisito de Aprobación */}
                    <div className="absolute bottom-2.5 left-3">
                      <span className="text-[10px] font-bold text-slate-300 bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" /> Req: {course.minWatchPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Información del Curso */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3
                        title={course.title}
                        className="text-base font-bold text-white group-hover:text-blue-400 transition line-clamp-1"
                      >
                        {course.title}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">
                        /{course.slug}
                      </p>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] leading-relaxed">
                      {course.description || 'Sin descripción redactada aún.'}
                    </p>

                    {/* Métricas: Nº de módulos y lecciones */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 px-2.5 py-1 rounded-xl">
                        <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="font-bold text-white">{course.modulesCount}</span>
                        <span className="text-slate-400 text-[11px]">
                          {course.modulesCount === 1 ? 'módulo' : 'módulos'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 px-2.5 py-1 rounded-xl">
                        <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="font-bold text-white">{course.lessonsCount}</span>
                        <span className="text-slate-400 text-[11px]">
                          {course.lessonsCount === 1 ? 'lección' : 'lecciones'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN: Editar / Publicar / Ver como estudiante */}
                <div className="p-4 bg-slate-950/50 border-t border-slate-800/80 grid grid-cols-3 gap-2">
                  {/* Botón 1: Editar */}
                  <button
                    onClick={() => handleOpenEdit(course)}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition cursor-pointer border border-slate-700/60"
                    title="Editar información y módulos"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-300" />
                    <span>Editar</span>
                  </button>

                  {/* Botón 2: Publicar / Borrador */}
                  <button
                    onClick={() => handleToggleStatus(course)}
                    disabled={isToggling}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      isPublished
                        ? 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40'
                    }`}
                    title={isPublished ? 'Cambiar a estado borrador' : 'Publicar curso para estudiantes'}
                  >
                    {isToggling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isPublished ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Borrador</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3.5 h-3.5" />
                        <span>Publicar</span>
                      </>
                    )}
                  </button>

                  {/* Botón 3: Ver como estudiante */}
                  <button
                    onClick={() => onViewAsStudent(course.slug)}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-bold transition cursor-pointer"
                    title="Previsualizar temario y contenido como estudiante"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="truncate">Ver alumno</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL CREAR NUEVO CURSO                                 */}
      {/* ======================================================== */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 my-8 animate-fade-in">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Nuevo Curso</h2>
                  <p className="text-xs text-slate-400">Define los datos iniciales para tu capacitación</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Título del Curso *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="ej. Fundamentos de Análisis de Datos"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    Slug / URL pública *
                  </label>
                  <label className="text-[11px] text-slate-400 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSlug}
                      onChange={(e) => setAutoSlug(e.target.checked)}
                      className="rounded accent-blue-600"
                    />
                    Autogenerar
                  </label>
                </div>
                <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono">
                  <span className="text-slate-500 select-none">/courses/</span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => {
                      setAutoSlug(false);
                      setSlug(slugify(e.target.value));
                    }}
                    placeholder="fundamentos-analisis-datos"
                    className="w-full bg-transparent text-white focus:outline-none ml-0.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe qué aprenderán los estudiantes en este programa..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  URL de Portada (Imagen)
                </label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Precio (0 = Gratuito)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as 'BOB' | 'USD')}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="BOB">BOB</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Aprobación Mínima (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={minWatchPercentage}
                    onChange={(e) => setMinWatchPercentage(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Estado Inicial
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('draft')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      status === 'draft'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    Borrador (Privado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('published')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      status === 'published'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    Publicado (Visible)
                  </button>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    <span>Crear Curso</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL EDITAR CURSO Y MÓDULOS                            */}
      {/* ======================================================== */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 my-8 animate-fade-in max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Editar Curso</h2>
                  <p className="text-xs text-slate-400">
                    Modifica los parámetros y gestiona la estructura de módulos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingCourse(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario de Edición */}
            <form onSubmit={handleUpdateCourse} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Título del Curso *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={editSlug}
                    onChange={(e) => setEditSlug(slugify(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  URL de Portada
                </label>
                <input
                  type="url"
                  value={editThumbnailUrl}
                  onChange={(e) => setEditThumbnailUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Precio
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Moneda
                  </label>
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value as 'BOB' | 'USD')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="BOB">BOB (Bolivianos)</option>
                    <option value="USD">USD (Dólares)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Req. Visto (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editMinWatchPercentage}
                    onChange={(e) => setEditMinWatchPercentage(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Estado del Curso
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('draft')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      editStatus === 'draft'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Borrador
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('published')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      editStatus === 'published'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Publicado
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('archived')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      editStatus === 'archived'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Archivado
                  </button>
                </div>
              </div>

              {/* SECCIÓN GESTIÓN RÁPIDA DE MÓDULOS */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">
                      Módulos del Curso ({editingCourse.modulesCount})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Añade módulos para estructurar el temario
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    placeholder="Título del nuevo módulo (ej. Módulo 3: Casos Prácticos)"
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddModule}
                    disabled={addingModule || !newModuleTitle.trim()}
                    className="px-4 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-500/40 text-xs font-bold transition disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {addingModule ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Añadir Módulo</span>
                  </button>
                </div>
              </div>

              {/* Botones de Acción del Modal */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const slugToPreview = editSlug || editingCourse.slug;
                    setEditingCourse(null);
                    onViewAsStudent(slugToPreview);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver cómo lo ve el estudiante</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingCourse(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <span>Guardar Cambios</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

