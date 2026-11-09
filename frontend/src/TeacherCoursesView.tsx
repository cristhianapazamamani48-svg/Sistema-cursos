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
  Clock,
  Search,
  Filter,
  X,
  Loader2,
  Tag,
} from 'lucide-react';
import { api } from './api';
import CourseFormWizard from './CourseFormWizard';
import CurriculumBuilder from './CurriculumBuilder';
import PublishChecklistModal from './PublishChecklistModal';

export interface ManagedCourse {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  category?: string | null;
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

  // Control del Wizard en 3 Pasos (Nuevo Curso o Editar)
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardCourse, setWizardCourse] = useState<ManagedCourse | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // Control del Constructor de Temario
  const [selectedCourseForCurriculum, setSelectedCourseForCurriculum] =
    useState<ManagedCourse | null>(null);

  // Control del Modal de Lista de Verificación para Publicar (V1.5)
  const [publishingCourse, setPublishingCourse] = useState<ManagedCourse | null>(null);

  // Estado para el toggle de publicación directo (para pasar a borrador)
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

  // Abrir wizard en modo nuevo curso
  const handleOpenNewCourse = () => {
    setWizardCourse(null);
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  // Abrir wizard en modo edición en un paso específico
  const handleOpenEdit = (course: ManagedCourse, step: 1 | 2 | 3 = 1) => {
    setWizardCourse(course);
    setWizardStep(step);
    setIsWizardOpen(true);
  };

  // Manejar clic en botón de publicación
  const handlePublishClick = (course: ManagedCourse) => {
    if (course.status === 'draft') {
      // V1.5: Abrir modal con lista de verificación
      setPublishingCourse(course);
    } else {
      // Si ya está publicado, cambiar a borrador directamente
      handleToggleToDraft(course);
    }
  };

  const handleToggleToDraft = async (course: ManagedCourse) => {
    setTogglingStatusId(course.id);
    try {
      const res = await api(`/api/courses/${course.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'draft' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al cambiar a borrador');
      }

      showToast('info', `El curso "${course.title}" se cambió a Borrador.`);
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, status: 'draft' } : c))
      );
    } catch (err: any) {
      showToast('error', err.message || 'No se pudo cambiar el estado');
    } finally {
      setTogglingStatusId(null);
    }
  };

  // Filtrado de cursos
  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.category && c.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && c.status === statusFilter;
  });

  if (selectedCourseForCurriculum) {
    return (
      <CurriculumBuilder
        course={selectedCourseForCurriculum}
        onBack={() => {
          setSelectedCourseForCurriculum(null);
          loadCourses();
        }}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-[#2B2D33]">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D1D5DB]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-[#2B2D33] tracking-tight">
              Mis Cursos
            </h1>
            <span className="text-xs uppercase font-extrabold px-2.5 py-1 rounded-lg bg-[#2B2D33] text-[#E4E6EA]">
              {currentUser.role === 'docente' ? 'Panel Docente' : 'Panel Administrador'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#555861] mt-1">
            Gestiona tus programas educativos, revisa módulos y lecciones, y publica contenidos para tus estudiantes.
          </p>
        </div>

        {/* Botón Destacado: + Nuevo curso */}
        <button
          onClick={handleOpenNewCourse}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#F2412C] hover:bg-[#D93522] text-white font-bold text-sm shadow-lg shadow-[#F2412C]/25 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer shrink-0"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>+ Nuevo curso</span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#D1D5DB] shadow-xs">
        {/* Input de Búsqueda */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#9EA3AC] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, temática, categoría o slug..."
            className="w-full bg-[#F8F9FA] border border-[#D1D5DB] rounded-xl pl-9 pr-4 py-2 text-xs text-[#2B2D33] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#F2412C] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9EA3AC] hover:text-[#2B2D33]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros por Estado */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-bold text-[#555861] px-1 hidden lg:inline-flex items-center gap-1">
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
                    ? 'bg-[#2B2D33] text-white shadow-sm'
                    : 'bg-[#F0F2F5] text-[#555861] hover:text-[#2B2D33] hover:bg-slate-200 border border-transparent'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    statusFilter === st
                      ? 'bg-[#F2412C] text-white'
                      : 'bg-white text-[#555861] border border-[#D1D5DB]'
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
          <Loader2 className="w-8 h-8 text-[#F2412C] animate-spin" />
          <p className="text-xs text-[#555861] font-medium">Cargando tus cursos...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        /* ESTADO VACÍO CON ILUSTRACIÓN Y MENSAJE */
        <div className="bg-white border border-[#D1D5DB] rounded-3xl p-8 sm:p-14 text-center max-w-2xl mx-auto shadow-sm relative overflow-hidden">
          <div className="relative mx-auto w-32 h-32 mb-6 flex items-center justify-center">
            <div className="w-24 h-24 rounded-3xl bg-[#E4E6EA] border border-[#D1D5DB] flex items-center justify-center text-[#2B2D33]">
              <BookOpen className="w-12 h-12 text-[#2B2D33]/70" />
            </div>
          </div>

          {searchQuery || statusFilter !== 'all' ? (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-[#2B2D33]">No se encontraron cursos coincidentes</h3>
              <p className="text-xs text-[#555861] max-w-md mx-auto">
                No hay cursos que coincidan con tus términos de búsqueda o filtros seleccionados.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#2B2D33] hover:bg-[#3B3E46] text-xs font-bold text-white transition cursor-pointer"
                >
                  Restablecer filtros
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xl sm:text-2xl font-black text-[#2B2D33]">
                Aún no tienes cursos en tu catálogo
              </h3>
              <p className="text-xs sm:text-sm text-[#555861] max-w-md mx-auto leading-relaxed">
                Comienza creando tu primer curso con nuestro formulario en 3 pasos (Información, Precio y Portada). Podrás guardarlo como borrador y organizar módulos cuando gustes.
              </p>
              <div className="pt-4">
                <button
                  onClick={handleOpenNewCourse}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#F2412C] hover:bg-[#D93522] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#F2412C]/25 hover:scale-105 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Crear mi primer curso</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* GRILLA DE TARJETAS DE CURSOS (FONDO BLANCO, DETALLES GRAFITO/ROJO) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const isPublished = course.status === 'published';
            const isDraft = course.status === 'draft';
            const isToggling = togglingStatusId === course.id;

            return (
              <div
                key={course.id}
                className="group bg-white border border-[#D1D5DB] hover:border-[#2B2D33]/40 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Portada / Thumbnail con Badges */}
                  <div className="relative h-48 w-full bg-[#2B2D33] overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-[#2B2D33] flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-2">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-[#E4E6EA] line-clamp-1 max-w-[200px]">
                          {course.slug}
                        </span>
                      </div>
                    )}

                    {/* Badge de Estado: Borrador / Publicado */}
                    <div className="absolute top-3 left-3">
                      {isPublished ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          Publicado
                        </span>
                      ) : isDraft ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#2B2D33]/90 text-amber-300 border border-amber-400/40 shadow-md">
                          <EyeOff className="w-3 h-3 text-amber-400" />
                          Borrador
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-700 text-white shadow-md">
                          Archivado
                        </span>
                      )}
                    </div>

                    {/* Badge de Precio / Gratis (BOB) */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-white/95 text-[#2B2D33] border border-white/40 shadow-md">
                        {Number(course.price) === 0
                          ? 'GRATIS'
                          : `${course.price} ${course.currency}`}
                      </span>
                    </div>

                    {/* Badge Categoría si existe */}
                    {course.category && (
                      <div className="absolute bottom-2.5 left-3">
                        <span className="text-[10px] font-bold text-white bg-[#2B2D33]/90 px-2.5 py-0.5 rounded-md border border-white/20 flex items-center gap-1 shadow-md">
                          <Tag className="w-3 h-3 text-[#F2412C]" /> {course.category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Información del Curso */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3
                        title={course.title}
                        className="text-base font-bold text-[#2B2D33] group-hover:text-[#F2412C] transition line-clamp-1"
                      >
                        {course.title}
                      </h3>
                      <p className="text-[11px] font-mono text-[#555861] mt-0.5 truncate">
                        /courses/{course.slug}
                      </p>
                    </div>

                    <p className="text-xs text-[#555861] line-clamp-2 min-h-[32px] leading-relaxed">
                      {course.description || 'Sin descripción redactada aún.'}
                    </p>

                    {/* Métricas: Nº de módulos y lecciones */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#E4E6EA] text-xs text-[#555861]">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-[#F0F2F5] border border-[#D1D5DB] px-2.5 py-1 rounded-xl">
                          <Layers className="w-3.5 h-3.5 text-[#2B2D33] shrink-0" />
                          <span className="font-bold text-[#2B2D33]">{course.modulesCount}</span>
                          <span className="text-[#555861] text-[11px]">
                            {course.modulesCount === 1 ? 'módulo' : 'módulos'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-[#F0F2F5] border border-[#D1D5DB] px-2.5 py-1 rounded-xl">
                          <FileText className="w-3.5 h-3.5 text-[#2B2D33] shrink-0" />
                          <span className="font-bold text-[#2B2D33]">{course.lessonsCount}</span>
                          <span className="text-[#555861] text-[11px]">
                            {course.lessonsCount === 1 ? 'lección' : 'lecciones'}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-[#555861] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#2B2D33]" /> {course.minWatchPercentage}% req.
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN: Temario / Editar / Publicar / Ver alumno */}
                <div className="p-3 bg-[#F8F9FA] border-t border-[#E4E6EA] grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Botón 1: Temario */}
                  <button
                    onClick={() => setSelectedCourseForCurriculum(course)}
                    className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-[#2B2D33] hover:bg-[#3B3E46] text-white text-xs font-bold transition cursor-pointer shadow-xs"
                    title="Construir temario: módulos y lecciones"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Temario</span>
                  </button>

                  {/* Botón 2: Editar */}
                  <button
                    onClick={() => handleOpenEdit(course, 1)}
                    className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-white hover:bg-slate-100 text-[#2B2D33] text-xs font-bold transition cursor-pointer border border-[#D1D5DB]"
                    title="Editar información, precio y portada"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  {/* Botón 3: Publicar con Checklist (V1.5) o Cambiar a Borrador */}
                  <button
                    onClick={() => handlePublishClick(course)}
                    disabled={isToggling}
                    className={`flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      isPublished
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-[#F2412C] hover:bg-[#D93522] text-white border-[#F2412C] shadow-sm shadow-[#F2412C]/25'
                    }`}
                    title={isPublished ? 'Cambiar a borrador' : 'Publicar curso (abre lista de verificación)'}
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

                  {/* Botón 4: Ver como estudiante */}
                  <button
                    onClick={() => onViewAsStudent(course.slug)}
                    className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-white hover:bg-slate-100 text-[#555861] hover:text-[#2B2D33] border border-[#D1D5DB] text-xs font-bold transition cursor-pointer"
                    title="Previsualizar como estudiante"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="truncate">Ver</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL REUTILIZABLE FORMULARIO EN 3 PASOS (NUEVO / EDITAR) */}
      <CourseFormWizard
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setWizardCourse(null);
        }}
        initialCourse={wizardCourse}
        initialStep={wizardStep}
        onSuccess={loadCourses}
        showToast={showToast}
      />

      {/* MODAL DE LISTA DE VERIFICACIÓN PARA PUBLICAR CURSO (V1.5) */}
      <PublishChecklistModal
        isOpen={Boolean(publishingCourse)}
        course={publishingCourse}
        onClose={() => setPublishingCourse(null)}
        onSuccess={() => {
          setPublishingCourse(null);
          loadCourses();
        }}
        onGoToEditCourse={(c, step) => handleOpenEdit(c, step)}
        onGoToCurriculum={(c) => setSelectedCourseForCurriculum(c)}
        showToast={showToast}
      />
    </div>
  );
}
