import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  X,
  PlayCircle,
  Clock,
  Sparkles,
  SearchX,
  RotateCcw,
  User as UserIcon,
  Play,
  ArrowRight,
  Award,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export interface CourseSummary {
  id: number;
  title: string;
  slug: string;
  description: string;
  category?: string | null;
  thumbnailUrl: string | null;
  price: string;
  currency: string;
  status: string;
  minWatchPercentage: number;
  teacherName?: string;
  lessonsCount?: number;
}

export interface EnrolledCourse {
  enrollmentId: number;
  courseId: number;
  status: 'active' | 'completed' | 'cancelled';
  slug: string;
  title: string;
}

interface CourseCatalogViewProps {
  courses: CourseSummary[];
  myCourses: EnrolledCourse[];
  isLoading: boolean;
  searchTerm: string;
  priceFilter: 'all' | 'free' | 'paid';
  onSearchChange: (term: string) => void;
  onPriceFilterChange: (priceType: 'all' | 'free' | 'paid') => void;
  onViewDetails: (slug: string) => void;
  onEnterClassroom: (slug: string) => void;
  onEnrollOrBuy: (courseId: number, price: string) => void;
}

export default function CourseCatalogView({
  courses,
  myCourses,
  isLoading,
  searchTerm,
  priceFilter,
  onSearchChange,
  onPriceFilterChange,
  onViewDetails,
  onEnterClassroom,
  onEnrollOrBuy,
}: CourseCatalogViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Categorías fijas y dinámicas detectadas en los cursos
  const categories = useMemo(() => {
    const defaultCats = ['Estrategia', 'Finanzas', 'Marketing', 'Liderazgo', 'Negocios'];
    const fromCourses = courses
      .map((c) => c.category)
      .filter((cat): cat is string => Boolean(cat && cat.trim()));

    const unique = Array.from(new Set([...defaultCats, ...fromCourses]));
    return [{ id: 'all', label: 'Todas las áreas' }, ...unique.map((c) => ({ id: c, label: c }))];
  }, [courses]);

  // Cursos filtrados por categoría y búsqueda local
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // Filtro de categoría
      if (selectedCategory !== 'all') {
        const cat = (c.category || '').toLowerCase();
        const title = c.title.toLowerCase();
        const target = selectedCategory.toLowerCase();
        if (!cat.includes(target) && !title.includes(target)) {
          return false;
        }
      }
      return true;
    });
  }, [courses, selectedCategory]);

  // Curso Destacado para el Hero superior (primer curso o el más completo)
  const featuredCourse = useMemo(() => {
    if (courses.length === 0) return null;
    return courses.find((c) => Number(c.price) === 0) || courses[0];
  }, [courses]);

  // Helper para estimar duración en horas
  const estimateDuration = (lessonsCount: number = 0) => {
    const totalMinutes = lessonsCount * 45; // ~45 minutos por unidad promedio
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins || 30} min`;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} horas`;
  };

  return (
    <div className="space-y-10 animate-fade-in pb-16">
      {/* ========================================================================= */}
      {/* 1. HERO BANNER PRINCIPAL CON BUSCADOR INTEGRADO                          */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-[#2B2D33] via-[#363940] to-[#1E2024] rounded-[2.5rem] p-6 sm:p-10 md:p-12 text-white relative overflow-hidden shadow-xl border border-white/10">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-radial from-[#F2412C]/25 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-[#F2412C] text-white shadow-md shadow-[#F2412C]/20">
            <Sparkles className="w-3.5 h-3.5" /> Catálogo de Alta Especialización
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15]">
            Potencia tu carrera con cursos de negocios certificados
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-[#E4E6EA]/90 leading-relaxed max-w-2xl font-normal">
            Aprende con metodologías prácticas, grabaciones de alta definición y evaluaciones diseñadas por docentes con experiencia corporativa real.
          </p>

          {/* Barra de búsqueda interactiva */}
          <div className="pt-2 max-w-xl">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-[#9EA3AC] absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar por tema, título, docente o especialidad..."
                className="w-full bg-white text-[#2B2D33] placeholder-slate-400 font-medium text-xs sm:text-sm rounded-2xl pl-12 pr-10 py-3.5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#F2412C] shadow-lg transition"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3.5 p-1 rounded-lg text-slate-400 hover:text-[#2B2D33] transition cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SECCIÓN DESTACADA (HERO CARD DESTACADA)                               */}
      {/* ========================================================================= */}
      {featuredCourse && !searchTerm && selectedCategory === 'all' && priceFilter === 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-[#2B2D33] flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" /> Curso Recomendado de la Semana
            </h2>
            <span className="text-[11px] font-bold text-[#F2412C] uppercase tracking-wider bg-[#F2412C]/10 px-2.5 py-0.5 rounded-full">
              Destacado
            </span>
          </div>

          <div className="bg-white border-2 border-[#F2412C]/30 hover:border-[#F2412C] rounded-[2rem] p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col lg:flex-row items-center gap-8 group">
            {featuredCourse.thumbnailUrl && (
              <div className="w-full lg:w-96 h-56 rounded-2xl overflow-hidden shrink-0 relative shadow-sm">
                <img
                  src={featuredCourse.thumbnailUrl}
                  alt={featuredCourse.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute top-3 left-3 bg-[#2B2D33]/90 backdrop-blur-xs text-white text-[11px] font-black px-3 py-1 rounded-xl border border-white/20">
                  {featuredCourse.category || 'Negocios'}
                </div>
                <div className="absolute top-3 right-3">
                  <span
                    className={`text-xs font-black px-3 py-1 rounded-xl shadow-md ${
                      Number(featuredCourse.price) === 0
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#F2412C] text-white'
                    }`}
                  >
                    {Number(featuredCourse.price) === 0 ? 'Gratis' : `${featuredCourse.price} ${featuredCourse.currency}`}
                  </span>
                </div>
              </div>
            )}

            <div className="flex-1 space-y-4 w-full">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#555861] font-semibold">
                  <UserIcon className="w-3.5 h-3.5 text-[#F2412C]" />
                  <span>{featuredCourse.teacherName || 'Docente Certificado'}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <PlayCircle className="w-3.5 h-3.5 text-[#555861]" />
                    {featuredCourse.lessonsCount || 9} lecciones
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#555861]" />
                    {estimateDuration(featuredCourse.lessonsCount || 9)}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-[#2B2D33] group-hover:text-[#F2412C] transition leading-tight">
                  {featuredCourse.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#555861] leading-relaxed line-clamp-2">
                  {featuredCourse.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => onViewDetails(featuredCourse.slug)}
                  className="px-5 py-3 bg-white hover:bg-slate-50 text-[#2B2D33] border border-[#D1D5DB] rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Ver Temario Completo
                </button>

                {myCourses.some((mc) => mc.courseId === featuredCourse.id) ? (
                  <button
                    onClick={() => onEnterClassroom(featuredCourse.slug)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Continuar Curso</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onEnrollOrBuy(featuredCourse.id, featuredCourse.price)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#F2412C] hover:bg-[#d93520] text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md shadow-[#F2412C]/20"
                  >
                    <span>{Number(featuredCourse.price) === 0 ? 'Inscribirme Gratis' : 'Comprar Curso'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FILTRO DE CATEGORÍAS (CHIPS) & FILTRO DE PRECIO                        */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-[#2B2D33]">Explorar por Especialidad</h2>
            <p className="text-xs text-[#555861]">Selecciona un área para filtrar los cursos</p>
          </div>

          {/* Filtro de precio (Todos / Gratis / De Pago) */}
          <div className="inline-flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-[#D1D5DB] shadow-xs self-start md:self-auto">
            <span className="text-[11px] font-bold text-[#555861] px-2">Precio:</span>
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'free', label: 'Gratis' },
                { id: 'paid', label: 'De Pago' },
              ] as const
            ).map((flt) => {
              const isActive = priceFilter === flt.id;
              return (
                <button
                  key={flt.id}
                  onClick={() => onPriceFilterChange(flt.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-[#2B2D33] text-white shadow-xs'
                      : 'text-[#555861] hover:text-[#2B2D33] hover:bg-slate-100'
                  }`}
                >
                  {flt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fila horizontal de chips filtrables con scroll suave */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-[#F2412C] text-white border-[#F2412C] shadow-md shadow-[#F2412C]/20'
                    : 'bg-white text-[#555861] border-[#D1D5DB] hover:border-[#2B2D33] hover:text-[#2B2D33]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. LISTA DE CURSOS / SKELETONS / ESTADO VACÍO                             */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs font-bold text-[#555861]">
            Mostrando {filteredCourses.length}{' '}
            {filteredCourses.length === 1 ? 'curso disponible' : 'cursos disponibles'}
            {searchTerm ? ` para "${searchTerm}"` : ''}
          </p>
        </div>

        {/* SKELETON LOADERS (MIENTRAS CARGA) */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white border border-[#E4E6EA] rounded-3xl overflow-hidden shadow-xs animate-pulse p-4 space-y-4"
              >
                <div className="w-full h-48 bg-slate-200 rounded-2xl" />
                <div className="space-y-2">
                  <div className="w-24 h-4 bg-slate-200 rounded" />
                  <div className="w-full h-6 bg-slate-200 rounded" />
                  <div className="w-3/4 h-4 bg-slate-200 rounded" />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="w-20 h-4 bg-slate-200 rounded" />
                  <div className="w-24 h-8 bg-slate-200 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          /* ESTADO VACÍO (SIN RESULTADOS) */
          <div className="bg-white border border-[#D1D5DB] rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-[#F2412C] flex items-center justify-center mx-auto">
              <SearchX className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-[#2B2D33]">No se encontraron cursos</h3>
              <p className="text-xs text-[#555861] leading-relaxed">
                {searchTerm || selectedCategory !== 'all' || priceFilter !== 'all'
                  ? 'No hay programas académicos que coincidan con tus criterios de búsqueda o filtros seleccionados.'
                  : 'Actualmente no hay cursos publicados en el catálogo.'}
              </p>
            </div>
            {(searchTerm || selectedCategory !== 'all' || priceFilter !== 'all') && (
              <button
                onClick={() => {
                  onSearchChange('');
                  setSelectedCategory('all');
                  onPriceFilterChange('all');
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2B2D33] hover:bg-[#1E2024] text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer Filtros</span>
              </button>
            )}
          </div>
        ) : (
          /* GRILLA DE TARJETAS DE CURSOS */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredCourses.map((c) => {
              const isEnrolled = myCourses.some((mc) => mc.courseId === c.id);
              const isFree = Number(c.price) === 0;
              const duration = estimateDuration(c.lessonsCount || 9);

              return (
                <div
                  key={c.id}
                  className="group bg-white border border-[#D1D5DB] hover:border-[#F2412C]/60 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Portada grande con efecto hover zoom */}
                    <div className="relative h-52 w-full bg-[#2B2D33] overflow-hidden">
                      {c.thumbnailUrl ? (
                        <img
                          src={c.thumbnailUrl}
                          alt={c.title}
                          className="w-full h-full object-cover group-hover:scale-108 transition duration-500"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-[#2B2D33] flex flex-col items-center justify-center p-6 text-center">
                          <BookOpen className="w-10 h-10 text-white/50 mb-2" />
                          <span className="text-xs font-bold text-[#E4E6EA]">{c.slug}</span>
                        </div>
                      )}

                      {/* Gradiente sutil para legibilidad de badges */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                      {/* Badge de Categoría (Superior Izquierda) */}
                      <div className="absolute top-3.5 left-3.5">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-white/95 backdrop-blur-xs text-[#2B2D33] px-2.5 py-1 rounded-lg shadow-sm border border-black/5">
                          {c.category || 'Negocios'}
                        </span>
                      </div>

                      {/* Badge de Precio / Gratis (Superior Derecha) */}
                      <div className="absolute top-3.5 right-3.5">
                        <span
                          className={`text-xs font-black px-3 py-1 rounded-xl shadow-md ${
                            isFree
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gradient-to-r from-[#F2412C] to-[#d93520] text-white'
                          }`}
                        >
                          {isFree ? 'Gratis' : `${c.price} ${c.currency}`}
                        </span>
                      </div>

                      {/* Metadatos inferiores flotantes sobre la imagen */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-bold text-white drop-shadow-sm">
                        <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-xs px-2.5 py-0.5 rounded-md">
                          <PlayCircle className="w-3.5 h-3.5 text-white" />
                          {c.lessonsCount ?? 0} lecciones
                        </span>
                        <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-xs px-2.5 py-0.5 rounded-md">
                          <Clock className="w-3.5 h-3.5 text-white" />
                          {duration}
                        </span>
                      </div>
                    </div>

                    {/* Información del curso */}
                    <div className="p-5 sm:p-6 space-y-3">
                      {/* Docente */}
                      <div className="flex items-center gap-2 text-xs text-[#555861] pb-2 border-b border-[#E4E6EA]">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-[#D1D5DB] flex items-center justify-center text-[#2B2D33] shrink-0 font-bold text-[10px]">
                          {(c.teacherName || 'D')[0]}
                        </div>
                        <span className="font-bold text-[#2B2D33] truncate">
                          {c.teacherName || 'Docente Certificado'}
                        </span>
                      </div>

                      {/* Título & Descripción */}
                      <div className="space-y-1.5">
                        <h3 className="text-base font-black text-[#2B2D33] group-hover:text-[#F2412C] transition-colors duration-200 line-clamp-2 leading-snug">
                          {c.title}
                        </h3>
                        <p className="text-xs text-[#555861] line-clamp-2 leading-relaxed">
                          {c.description || 'Domina los conceptos prácticos con este curso integral de negocios.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Acciones al pie */}
                  <div className="p-5 sm:p-6 pt-0">
                    <div className="pt-3.5 border-t border-[#E4E6EA] flex items-center gap-2.5">
                      <button
                        onClick={() => onViewDetails(c.slug)}
                        className="flex-1 bg-white hover:bg-slate-50 text-[#2B2D33] border border-[#D1D5DB] text-xs font-bold py-2.5 px-3 rounded-xl transition cursor-pointer text-center"
                      >
                        Ver Temario
                      </button>

                      {isEnrolled ? (
                        <button
                          onClick={() => onEnterClassroom(c.slug)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Aula</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onEnrollOrBuy(c.id, c.price)}
                          className="flex-1 bg-[#F2412C] hover:bg-[#d93520] text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shadow-[#F2412C]/20 cursor-pointer"
                        >
                          <span>{isFree ? 'Inscribirme' : 'Comprar'}</span>
                        </button>
                      )}
                    </div>
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
