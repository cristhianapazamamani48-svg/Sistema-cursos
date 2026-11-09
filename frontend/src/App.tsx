import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  Lock, 
  Play, 
  FileText, 
  ChevronDown, 
  LogIn, 
  LogOut, 
  Award, 
  Clock, 
  Layers, 
  GraduationCap, 
  ShieldCheck, 
  Sparkles,
  ShoppingBag,
  UserCheck,
  AlertCircle,
  Menu,
  Search,
  X,
  User as UserIcon,
  PlayCircle,
  SearchX,
  RotateCcw
} from 'lucide-react';

import Sidebar from './Sidebar';
import AdminPanel from './AdminPanel';
import YouTubeTracker from './YouTubeTracker';
import TeacherCoursesView from './TeacherCoursesView';
import { api, setCsrfToken as setGlobalCsrfToken } from './api';

interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

interface CourseSummary {
  id: number;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string | null;
  price: string;
  currency: string;
  status: string;
  minWatchPercentage: number;
  teacherName?: string;
  lessonsCount?: number;
}

interface EnrolledCourse {
  enrollmentId: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt: string | null;
  courseId: number;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  description: string;
  price: string;
  currency: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}

interface ClassroomLesson {
  id: number;
  title: string;
  orderIndex: number;
  isLocked: boolean;
  isCompleted: boolean;
  progressId: number | null;
  currentWatchPercentage: number;
  lastPositionSeconds: number;
  video: {
    id: number;
    providerRef: string;
    durationSeconds: number;
  } | null;
}

interface ClassroomModule {
  id: number;
  title: string;
  description: string | null;
  orderIndex: number;
  isLocked: boolean;
  lessons: ClassroomLesson[];
}

interface ClassroomData {
  course: {
    id: number;
    title: string;
    slug: string;
    description: string;
    minWatchPercentage: number;
  };
  enrollment: {
    id: number;
    status: 'active' | 'completed';
    completedAt: string | null;
  };
  overallProgress: {
    totalLessons: number;
    completedLessons: number;
    percentage: number;
  };
  modules: ClassroomModule[];
}

interface CourseDetail {
  id: number;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string | null;
  price: string;
  currency: string;
  status: string;
  minWatchPercentage: number;
  modules: {
    id: number;
    title: string;
    description: string | null;
    orderIndex: number;
    lessons: {
      id: number;
      title: string;
      orderIndex: number;
      status: string;
      videoDurationSeconds: number | null;
    }[];
  }[];
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'course-detail' | 'my-courses' | 'classroom' | 'admin'>('catalog');
  
  // Catálogo y cursos
  const [catalog, setCatalog] = useState<CourseSummary[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogPriceFilter, setCatalogPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [myCourses, setMyCourses] = useState<EnrolledCourse[]>([]);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [classroomData, setClassroomData] = useState<ClassroomData | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<ClassroomLesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<number[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [teacherSubTab, setTeacherSubTab] = useState<'teaching' | 'enrolled'>('teaching');

  // Auth modal y formulario
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authMsg, setAuthMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Navegación Sidebar y Control Responsive
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [createCourseTrigger, setCreateCourseTrigger] = useState(0);
  const [isWizardOpenInTeacherView, setIsWizardOpenInTeacherView] = useState(false);

  const handleCreateCourseFromSidebar = () => {
    setActiveTab('my-courses');
    setTeacherSubTab('teaching');
    setCreateCourseTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    checkAuth();
    loadCatalog();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadMyCourses();
      loadMyOrders();
    }
  }, [currentUser]);

  // Mensaje flotante automático
  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const checkAuth = async () => {
    try {
      const res = await api('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        if (data.csrfToken) {
          setGlobalCsrfToken(data.csrfToken);
        }
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
  };

  const loadCatalog = async (searchParam?: string, filterParam?: 'all' | 'free' | 'paid') => {
    setIsCatalogLoading(true);
    try {
      const s = searchParam !== undefined ? searchParam : catalogSearch;
      const f = filterParam !== undefined ? filterParam : catalogPriceFilter;
      const params = new URLSearchParams();
      if (s.trim()) params.append('search', s.trim());
      if (f && f !== 'all') params.append('priceType', f);

      const res = await api(`/api/courses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCatalog(data);
      }
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    } finally {
      setIsCatalogLoading(false);
    }
  };

  // Debounce para búsqueda en catálogo (V2.1)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCatalog(catalogSearch, catalogPriceFilter);
    }, 280);
    return () => clearTimeout(timer);
  }, [catalogSearch]);

  const loadMyCourses = async () => {
    try {
      const res = await api('/api/courses/my/enrolled');
      if (res.ok) {
        const data = await res.json();
        setMyCourses(data);
      }
    } catch (err) {
      console.error('Error cargando cursos inscritos:', err);
    }
  };

  const loadMyOrders = async () => {
    try {
      const res = await api('/api/orders/my');
      if (res.ok) {
        const data = await res.json();
        setPendingOrders(data.filter((o: any) => o.status === 'pending'));
      }
    } catch (err) {
      console.error('Error cargando órdenes:', err);
    }
  };

  const loadCourseDetail = async (slug: string) => {
    try {
      let res = await api(`/api/courses/${slug}`);
      if (!res.ok && currentUser && ['admin', 'superadmin', 'docente'].includes(currentUser.role)) {
        res = await api(`/api/courses/preview/${slug}`);
      }
      if (res.ok) {
        const data = await res.json();
        setCourseDetail(data);
        setActiveTab('course-detail');
      } else {
        showToast('error', 'No se pudo cargar el detalle del curso');
      }
    } catch (err) {
      showToast('error', 'Error de conexión');
    }
  };

  const enterClassroom = async (slug: string) => {
    try {
      const res = await api(`/api/courses/${slug}/classroom`);
      if (res.ok) {
        const data: ClassroomData = await res.json();
        setClassroomData(data);
        setActiveTab('classroom');

        // Expandir todos los módulos desbloqueados por defecto
        const unlockedModuleIds = data.modules.filter((m) => !m.isLocked).map((m) => m.id);
        setExpandedModules(unlockedModuleIds);

        // Seleccionar la primera lección desbloqueada o la primera disponible
        let foundLesson: ClassroomLesson | null = null;
        for (const mod of data.modules) {
          if (!mod.isLocked) {
            for (const les of mod.lessons) {
              if (!les.isCompleted) {
                foundLesson = les;
                break;
              }
            }
            if (foundLesson) break;
          }
        }
        if (!foundLesson && data.modules[0]?.lessons[0]) {
          foundLesson = data.modules[0].lessons[0];
        }
        setSelectedLesson(foundLesson);
      } else if (res.status === 403) {
        showToast('error', 'No tienes una inscripción activa a este curso');
      } else {
        showToast('error', 'No se pudo cargar el aula virtual');
      }
    } catch (err) {
      showToast('error', 'Error al acceder al aula');
    }
  };

  const handleEnrollOrBuy = async (courseId: number, price: string) => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }

    try {
      const res = await api('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ courseId }),
      });

      const data = await res.json();

      if (res.ok) {
        if (Number(price) === 0) {
          showToast('success', '¡Inscripción exitosa! Bienvenido al curso.');
          await loadMyCourses();
          if (courseDetail) {
            await enterClassroom(courseDetail.slug);
          }
        } else {
          showToast(
            'success',
            `Orden #${data.id} creada por ${data.amount} ${data.currency}. El pago debe validarse en el panel administrativo.`
          );
          await loadMyOrders();
          if (courseDetail) {
            await loadCourseDetail(courseDetail.slug);
          }
        }
      } else {
        showToast('error', data.message || 'Error al procesar inscripción');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error de comunicación');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMsg(null);
    try {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Credenciales inválidas');

      setCurrentUser(data.user);
      if (data.csrfToken) {
        setGlobalCsrfToken(data.csrfToken);
      }
      setAuthModalOpen(false);
      setEmail('');
      setPassword('');
      showToast('success', `¡Bienvenido, ${data.user.fullName}!`);
    } catch (err: any) {
      setAuthMsg({ type: 'error', text: err.message });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMsg(null);
    try {
      const res = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error en el registro');

      setAuthMsg({ type: 'success', text: '¡Cuenta creada! Ya puedes iniciar sesión.' });
      setAuthMode('login');
      setPassword('');
    } catch (err: any) {
      setAuthMsg({ type: 'error', text: err.message });
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setAuthMode('login');
  };

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      setClassroomData(null);
      setMyCourses([]);
      setActiveTab('catalog');
      showToast('info', 'Has cerrado sesión.');
    } catch (err) {
      console.error(err);
    }
  };

  const toggleModule = (modId: number) => {
    setExpandedModules((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  return (
    <div className="min-h-screen bg-[#E4E6EA] text-[#2B2D33] flex flex-col font-sans selection:bg-[#F2412C] selection:text-white">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-md px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-medium transition-all transform animate-bounce-subtle ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-[#2D1210]/90 border-[#F2412C]/50 text-[#FAA99F]'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Sidebar fijo para Escritorio y Drawer para Móvil */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        isCreatingCourse={isWizardOpenInTeacherView}
        hasActiveClassroom={Boolean(classroomData)}
        onNavigate={(tab) => {
          if (tab === 'my-courses') {
            loadMyCourses();
          }
          setActiveTab(tab);
          setIsMobileMenuOpen(false);
        }}
        onCreateCourse={handleCreateCourseFromSidebar}
        onOpenAuth={() => {
          setAuthMode('login');
          setAuthModalOpen(true);
          setIsMobileMenuOpen(false);
        }}
        onLogout={handleLogout}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Contenedor Principal (con padding izquierdo en Desktop para el Sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* Barra superior móvil con menú hamburguesa */}
        <header className="md:hidden sticky top-0 z-30 bg-[#2B2D33] border-b border-[#363940] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-[#363940] text-white hover:bg-[#40444B] transition cursor-pointer"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#F2412C] flex items-center justify-center text-white">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="font-black text-white text-base">EducaSuite 360</span>
            </div>
          </div>

          {currentUser ? (
            <div className="w-8 h-8 rounded-xl bg-[#363940] flex items-center justify-center text-white font-bold text-xs border border-white/10">
              {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthMode('login');
                setAuthModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#F2412C] hover:bg-[#D93522] text-white font-bold text-xs cursor-pointer"
            >
              Acceder
            </button>
          )}
        </header>

      {/* CONTENIDO PRINCIPAL POR VISTA */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
        {/* VISTA 1: CATÁLOGO DE CURSOS (V2.1) */}
        {activeTab === 'catalog' && (
          <div className="space-y-8 animate-fade-in">
            {/* Encabezado con Propuesta de Valor y Buscador Integrado */}
            <div className="relative rounded-3xl bg-[#2B2D33] border border-[#363940] p-6 sm:p-10 shadow-sm text-white space-y-6">
              <div className="max-w-3xl space-y-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider bg-[#F2412C] text-white px-3 py-1 rounded-full shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" /> Capacitación & Certificación Profesional
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  Aprende a tu ritmo con verificación de progreso real
                </h1>
                <p className="text-xs sm:text-sm text-[#E4E6EA]/80 leading-relaxed max-w-2xl">
                  Cursos interactivos con validación de lecciones segundo a segundo, docentes especializados y certificación avalada para tu crecimiento profesional.
                </p>
              </div>

              {/* Buscador Integrado en el Encabezado */}
              <div className="relative max-w-2xl">
                <div className="relative flex items-center">
                  <Search className="w-5 h-5 text-[#9EA3AC] absolute left-4 pointer-events-none" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Buscar cursos por título, temática, descripción o docente..."
                    className="w-full bg-white text-[#2B2D33] placeholder-slate-400 font-medium text-xs sm:text-sm rounded-2xl pl-12 pr-10 py-3.5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#F2412C] shadow-lg transition"
                  />
                  {catalogSearch && (
                    <button
                      onClick={() => {
                        setCatalogSearch('');
                        loadCatalog('', catalogPriceFilter);
                      }}
                      className="absolute right-3.5 p-1 rounded-lg text-slate-400 hover:text-[#2B2D33] transition cursor-pointer"
                      title="Limpiar búsqueda"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Barra de Filtros y Resumen de Cursos */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#2B2D33]">Cursos Disponibles</h2>
                <p className="text-xs text-[#555861] mt-0.5">
                  {catalog.length === 1
                    ? '1 curso disponible'
                    : `${catalog.length} cursos disponibles`}
                  {catalogSearch ? ` para "${catalogSearch}"` : ''}
                  {isCatalogLoading ? ' (actualizando...)' : ''}
                </p>
              </div>

              {/* Filtro Gratis / De Pago / Todos */}
              <div className="inline-flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-[#D1D5DB] shadow-xs self-start sm:self-auto">
                <span className="text-[11px] font-bold text-[#555861] px-2 hidden sm:inline">Precio:</span>
                {(
                  [
                    { id: 'all', label: 'Todos' },
                    { id: 'free', label: 'Gratis' },
                    { id: 'paid', label: 'De Pago' },
                  ] as const
                ).map((flt) => {
                  const isActive = catalogPriceFilter === flt.id;
                  return (
                    <button
                      key={flt.id}
                      onClick={() => {
                        setCatalogPriceFilter(flt.id);
                        loadCatalog(catalogSearch, flt.id);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
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

            {/* Estado Vacío o Grilla de Cursos */}
            {catalog.length === 0 ? (
              <div className="bg-white border border-[#D1D5DB] rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-[#E4E6EA] text-[#555861] flex items-center justify-center mx-auto">
                  <SearchX className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-[#2B2D33]">
                    No se encontraron cursos
                  </h3>
                  <p className="text-xs text-[#555861] max-w-sm mx-auto leading-relaxed">
                    {catalogSearch || catalogPriceFilter !== 'all'
                      ? 'No hay resultados que coincidan con tus criterios de búsqueda o filtro de precio.'
                      : 'Actualmente no hay cursos publicados en el catálogo.'}
                  </p>
                </div>
                {(catalogSearch || catalogPriceFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setCatalogSearch('');
                      setCatalogPriceFilter('all');
                      loadCatalog('', 'all');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2B2D33] hover:bg-[#3B3E46] text-white text-xs font-bold transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer Filtros</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {catalog.map((c) => {
                  const isEnrolled = myCourses.some((mc) => mc.courseId === c.id);
                  const isFree = Number(c.price) === 0;

                  return (
                    <div
                      key={c.id}
                      className="group bg-white border border-[#D1D5DB] hover:border-[#2B2D33]/40 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>
                        {/* Portada / Thumbnail */}
                        <div className="relative h-48 w-full bg-[#2B2D33] overflow-hidden">
                          {c.thumbnailUrl ? (
                            <img
                              src={c.thumbnailUrl}
                              alt={c.title}
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
                                {c.slug}
                              </span>
                            </div>
                          )}

                          {/* Badges superiores: Asistencia mínima y Precio / Gratis */}
                          <div className="absolute top-3 left-3">
                            <span className="text-[11px] font-bold bg-[#2B2D33]/90 text-[#E4E6EA] px-2.5 py-1 rounded-lg border border-white/20 shadow-xs">
                              Min. {c.minWatchPercentage}%
                            </span>
                          </div>

                          <div className="absolute top-3 right-3">
                            <span
                              className={`text-xs font-black px-3 py-1 rounded-xl shadow-md ${
                                isFree
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[#F2412C] text-white'
                              }`}
                            >
                              {isFree ? 'Gratis' : `${c.price} ${c.currency}`}
                            </span>
                          </div>
                        </div>

                        {/* Info del curso: Docente, Lecciones, Título, Descripción */}
                        <div className="p-6 space-y-3">
                          {/* Metadatos: Docente y Nº de Lecciones */}
                          <div className="flex items-center justify-between text-[11px] text-[#555861] pb-2 border-b border-[#E4E6EA]">
                            <div
                              className="flex items-center gap-1.5 truncate max-w-[60%]"
                              title={c.teacherName || 'Docente Certificado'}
                            >
                              <UserIcon className="w-3.5 h-3.5 text-[#2B2D33] shrink-0" />
                              <span className="font-semibold truncate">
                                {c.teacherName || 'Docente Certificado'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 font-bold text-[#2B2D33]">
                              <PlayCircle className="w-3.5 h-3.5 text-[#F2412C]" />
                              <span>{c.lessonsCount ?? 0} {c.lessonsCount === 1 ? 'lección' : 'lecciones'}</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <h3 className="text-lg font-bold text-[#2B2D33] group-hover:text-[#F2412C] transition line-clamp-2">
                              {c.title}
                            </h3>
                            <p className="text-xs text-[#555861] line-clamp-2 leading-relaxed">
                              {c.description || 'Domina los conceptos prácticos con este curso integral.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Botones de Acción al pie de la tarjeta */}
                      <div className="p-6 pt-0">
                        <div className="pt-4 border-t border-[#E4E6EA] flex items-center gap-3">
                          <button
                            onClick={() => loadCourseDetail(c.slug)}
                            className="flex-1 bg-white hover:bg-slate-50 text-[#2B2D33] border border-[#D1D5DB] text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                          >
                            Ver Temario
                          </button>

                          {isEnrolled ? (
                            <button
                              onClick={() => enterClassroom(c.slug)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" /> Entrar al Aula
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEnrollOrBuy(c.id, c.price)}
                              className="flex-1 bg-[#F2412C] hover:bg-[#D93522] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-[#F2412C]/20 cursor-pointer"
                            >
                              {isFree ? 'Inscribirme Gratis' : 'Comprar Curso'}
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
        )}

        {/* VISTA 2: DETALLE DEL CURSO Y TEMARIO */}
        {activeTab === 'course-detail' && courseDetail && (
          <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
            <button
              onClick={() => setActiveTab('catalog')}
              className="text-xs font-bold text-[#555861] hover:text-white flex items-center gap-2 transition"
            >
              ← Volver al Catálogo
            </button>

            {/* Cabecera del Curso */}
            <div className="bg-white border border-[#D1D5DB] rounded-3xl p-8 shadow-xs flex flex-col md:flex-row gap-8 items-start justify-between">
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase px-3 py-1 rounded-xl bg-[#F2412C]/20 text-[#F2412C] border border-[#F2412C]/30">
                    {Number(courseDetail.price) === 0 ? 'Curso Gratuito' : `${courseDetail.price} ${courseDetail.currency}`}
                  </span>
                  <span className="text-xs text-[#555861] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Requisito de aprobación: {courseDetail.minWatchPercentage}%
                  </span>
                </div>
                <h1 className="text-3xl font-black text-[#2B2D33]">{courseDetail.title}</h1>
                <p className="text-sm text-[#555861] leading-relaxed">{courseDetail.description}</p>
              </div>

              {/* Caja de Acción */}
              <div className="bg-[#F8F9FA] border border-[#D1D5DB] rounded-2xl p-6 w-full md:w-80 space-y-4 shrink-0">
                <div className="text-center space-y-1">
                  <span className="text-xs text-[#555861]">Inversión</span>
                  <div className="text-3xl font-black text-[#2B2D33]">
                    {Number(courseDetail.price) === 0 ? 'Gratis' : `${courseDetail.price} ${courseDetail.currency}`}
                  </div>
                </div>

                {myCourses.some((c) => c.courseId === courseDetail.id) ? (
                  <button
                    onClick={() => enterClassroom(courseDetail.slug)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" /> Ya estás inscrito: Entrar al Aula
                  </button>
                ) : pendingOrders.some((o) => o.courseId === courseDetail.id) ? (
                  <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl text-center space-y-1">
                    <span className="text-xs font-bold text-amber-300 block">⚠️ Orden Pendiente de Pago</span>
                    <p className="text-[11px] text-amber-200/80">
                      Un administrador validará tu pago desde el panel para activar tu acceso.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEnrollOrBuy(courseDetail.id, courseDetail.price)}
                    className="w-full bg-[#F2412C] hover:bg-[#F5543F] text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg shadow-[#F2412C]/30 transition flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {Number(courseDetail.price) === 0 ? 'Inscribirme Gratis Ahora' : 'Comprar Curso Ahora'}
                  </button>
                )}
              </div>
            </div>

            {/* Temario de Módulos y Lecciones */}
            <div className="space-y-4">
              <h2 className="text-xl font-black text-[#2B2D33]">Temario del Curso</h2>
              <div className="space-y-3">
                {courseDetail.modules.map((m) => (
                  <div key={m.id} className="bg-white border border-[#D1D5DB] rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#363940] flex items-center justify-center font-bold text-xs text-[#F2412C]">
                          {m.orderIndex}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#2B2D33]">{m.title}</h3>
                          {m.description && <p className="text-xs text-[#555861]">{m.description}</p>}
                        </div>
                      </div>
                      <span className="text-xs text-[#636870] font-medium">
                        {m.lessons.length} lección(es)
                      </span>
                    </div>

                    <div className="pl-11 space-y-2 border-t border-[#E4E6EA] pt-3">
                      {m.lessons.map((l) => (
                        <div key={l.id} className="flex items-center justify-between text-xs py-1.5 text-[#2B2D33]">
                          <span className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-[#636870]" />
                            {l.title}
                          </span>
                          {l.videoDurationSeconds && (
                            <span className="text-[#636870] font-mono text-[11px]">
                              {Math.floor(l.videoDurationSeconds / 60)}:{(l.videoDurationSeconds % 60).toString().padStart(2, '0')} min
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VISTA 3: MIS CURSOS (DOCENTE / ADMIN / ESTUDIANTE) */}
        {activeTab === 'my-courses' && currentUser && (
          <div className="space-y-6 animate-fade-in">
            {['docente', 'admin', 'superadmin'].includes(currentUser.role) ? (
              <div className="space-y-6">
                {/* Selector de subvista solo si el staff tiene cursos como estudiante */}
                {myCourses.length > 0 && (
                  <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#D1D5DB] w-fit shadow-xs">
                    <button
                      onClick={() => setTeacherSubTab('teaching')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        teacherSubTab === 'teaching'
                          ? 'bg-[#F2412C] text-white shadow-md shadow-[#F2412C]/30'
                          : 'text-[#555861] hover:text-white hover:bg-[#363940]/60'
                      }`}
                    >
                      🎓 Gestión de Mis Cursos
                    </button>
                    <button
                      onClick={() => setTeacherSubTab('enrolled')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        teacherSubTab === 'enrolled'
                          ? 'bg-[#F2412C] text-white shadow-md shadow-[#F2412C]/30'
                          : 'text-[#555861] hover:text-white hover:bg-[#363940]/60'
                      }`}
                    >
                      📚 Cursos Inscritos como Estudiante ({myCourses.length})
                    </button>
                  </div>
                )}

                {teacherSubTab === 'teaching' ? (
                  <TeacherCoursesView
                    currentUser={currentUser}
                    onViewAsStudent={loadCourseDetail}
                    showToast={showToast}
                    openCreateTrigger={createCourseTrigger}
                    onWizardStateChange={setIsWizardOpenInTeacherView}
                  />
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-black text-[#2B2D33]">Mis Cursos Inscritos</h2>
                      <p className="text-xs text-[#555861]">Tus inscripciones y avance como estudiante</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {myCourses.map((c) => (
                        <div
                          key={c.enrollmentId}
                          className="bg-white border border-[#D1D5DB] rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-[#2B2D33]/30 transition shadow-xs"
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <span
                                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                  c.status === 'completed'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-[#F2412C]/20 text-[#F2412C] border border-[#F2412C]/30'
                                }`}
                              >
                                {c.status === 'completed' ? 'Completado' : 'En Curso'}
                              </span>
                              <span className="text-xs font-bold text-[#555861]">{c.progressPercentage}%</span>
                            </div>

                            <h3 className="text-base font-bold text-[#2B2D33]">{c.title}</h3>
                            <p className="text-xs text-[#555861] line-clamp-2">{c.description}</p>
                          </div>

                          <div className="space-y-3 pt-3 border-t border-[#E4E6EA]">
                            <div className="space-y-1.5">
                              <div className="w-full bg-[#363940] h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${c.progressPercentage}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-[11px] text-[#636870]">
                                <span>{c.completedLessons} de {c.totalLessons} lecciones aprobadas</span>
                              </div>
                            </div>

                            <button
                              onClick={() => enterClassroom(c.slug)}
                              className="w-full bg-[#F2412C] hover:bg-[#F5543F] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#F2412C]/20"
                            >
                              <Play className="w-3.5 h-3.5" /> Continuar Aprendiendo
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* VISTA PARA ESTUDIANTES */
              <div className="space-y-8">
                <div>
                  <h1 className="text-2xl font-black text-[#2B2D33]">Mis Cursos</h1>
                  <p className="text-xs text-[#555861]">Continúa con tus capacitaciones y revisa tu avance en tiempo real</p>
                </div>

                {myCourses.length === 0 ? (
                  <div className="bg-[#2B2D33] border border-[#363940] rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto">
                    <div className="w-16 h-16 rounded-full bg-[#363940] flex items-center justify-center mx-auto text-[#555861]">
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-white">No tienes cursos activos</h3>
                    <p className="text-xs text-[#555861] leading-relaxed">
                      Inscríbete a un curso del catálogo para comenzar a aprender de inmediato.
                    </p>
                    <button
                      onClick={() => setActiveTab('catalog')}
                      className="bg-[#F2412C] hover:bg-[#F5543F] text-white text-xs font-bold py-2.5 px-6 rounded-xl transition"
                    >
                      Explorar Catálogo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myCourses.map((c) => (
                      <div
                        key={c.enrollmentId}
                        className="bg-white border border-[#D1D5DB] rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-[#2B2D33]/30 transition shadow-xs"
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                c.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-[#F2412C]/20 text-[#F2412C] border border-[#F2412C]/30'
                              }`}
                            >
                              {c.status === 'completed' ? 'Completado' : 'En Curso'}
                            </span>
                            <span className="text-xs font-bold text-[#555861]">{c.progressPercentage}%</span>
                          </div>

                          <h3 className="text-base font-bold text-[#2B2D33]">{c.title}</h3>
                          <p className="text-xs text-[#555861] line-clamp-2">{c.description}</p>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-[#E4E6EA]">
                          {/* Barra de progreso visual */}
                          <div className="space-y-1.5">
                            <div className="w-full bg-[#363940] h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${c.progressPercentage}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-[11px] text-[#636870]">
                              <span>{c.completedLessons} de {c.totalLessons} lecciones aprobadas</span>
                            </div>
                          </div>

                          <button
                            onClick={() => enterClassroom(c.slug)}
                            className="w-full bg-[#F2412C] hover:bg-[#F5543F] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#F2412C]/20"
                          >
                            <Play className="w-3.5 h-3.5" /> Continuar Aprendiendo
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* VISTA 4: AULA VIRTUAL CON BLOQUEO SECUENCIAL Y REPRODUCTOR */}
        {activeTab === 'classroom' && classroomData && (
          <div className="space-y-6 animate-fade-in">
            {/* Header del Aula */}
            <div className="bg-white border border-[#D1D5DB] rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#F2412C] bg-[#F2412C]/10 px-2.5 py-0.5 rounded border border-[#F2412C]/20">
                  Aula Virtual
                </span>
                <h1 className="text-2xl font-black text-[#2B2D33] mt-1">{classroomData.course.title}</h1>
              </div>

              {/* Progreso del curso */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-xs text-[#555861]">Progreso Total</span>
                  <div className="text-xl font-black text-[#2B2D33]">
                    {classroomData.overallProgress.percentage}%
                  </div>
                </div>

                {classroomData.enrollment.status === 'completed' ? (
                  <button
                    disabled
                    title="Certificado disponible al concluir la validación académica"
                    className="opacity-75 cursor-not-allowed bg-emerald-600/80 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2"
                  >
                    <Award className="w-4 h-4" /> Solicitar Certificado
                  </button>
                ) : (
                  <span className="text-xs bg-[#363940] text-[#555861] font-semibold px-3 py-2 rounded-xl border border-[#40444B]">
                    {classroomData.overallProgress.completedLessons} / {classroomData.overallProgress.totalLessons} lecciones
                  </span>
                )}
              </div>
            </div>

            {/* Layout Principal: Temario Izquierda + Reproductor Centro/Derecha */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Barra lateral de Temario y Candados */}
              <div className="lg:col-span-4 space-y-3">
                <div className="bg-white border border-[#D1D5DB] rounded-3xl p-5 space-y-4 shadow-xs">
                  <h3 className="text-sm font-bold text-[#2B2D33] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#F2412C]" /> Contenido del Curso
                  </h3>

                  <div className="space-y-3">
                    {classroomData.modules.map((m) => {
                      const isExpanded = expandedModules.includes(m.id);

                      return (
                        <div
                          key={m.id}
                          className={`rounded-2xl border transition-all ${
                            m.isLocked
                              ? 'bg-[#F0F2F5] border-[#E4E6EA] opacity-60'
                              : 'bg-[#F8F9FA] border-[#D1D5DB]'
                          }`}
                        >
                          {/* Cabecera del Módulo */}
                          <button
                            onClick={() => !m.isLocked && toggleModule(m.id)}
                            className="w-full text-left p-3.5 flex items-center justify-between gap-3 focus:outline-none"
                          >
                            <div className="flex items-center gap-2.5">
                              {m.isLocked ? (
                                <Lock className="w-4 h-4 text-[#636870] shrink-0" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-[#F5543F] shrink-0"></div>
                              )}
                              <span className="text-xs font-bold text-[#2B2D33] line-clamp-1">{m.title}</span>
                            </div>

                            {!m.isLocked && (
                              <ChevronDown
                                className={`w-4 h-4 text-[#555861] transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            )}
                          </button>

                          {/* Lecciones del Módulo */}
                          {isExpanded && !m.isLocked && (
                            <div className="px-3 pb-3 space-y-1.5 border-t border-[#363940]/80 pt-2">
                              {m.lessons.map((les) => {
                                const isCurrent = selectedLesson?.id === les.id;

                                return (
                                  <button
                                    key={les.id}
                                    onClick={() => !les.isLocked && setSelectedLesson(les)}
                                    disabled={les.isLocked}
                                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition ${
                                      isCurrent
                                        ? 'bg-[#F2412C] text-white font-bold shadow-md shadow-[#F2412C]/30'
                                        : les.isCompleted
                                        ? 'bg-[#2B2D33]/60 hover:bg-[#363940] text-slate-200'
                                        : 'bg-white hover:bg-slate-100 text-[#2B2D33]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 line-clamp-1">
                                      {les.isCompleted ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                      ) : les.isLocked ? (
                                        <Lock className="w-3.5 h-3.5 text-[#636870] shrink-0" />
                                      ) : (
                                        <Play className="w-3.5 h-3.5 text-[#F2412C] shrink-0" />
                                      )}
                                      <span className="truncate">{les.title}</span>
                                    </div>

                                    {les.isCompleted && (
                                      <span className="text-[10px] text-emerald-400 font-bold shrink-0">
                                        100%
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Área del Reproductor y Contenido Central */}
              <div className="lg:col-span-8 space-y-6">
                {selectedLesson ? (
                  <div className="bg-white border border-[#D1D5DB] rounded-3xl p-6 space-y-6 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-[#F2412C] font-bold">Lección Actual</span>
                        <h2 className="text-xl font-black text-[#2B2D33]">{selectedLesson.title}</h2>
                      </div>
                      {selectedLesson.isCompleted && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-4 h-4" /> Lección Completada
                        </span>
                      )}
                    </div>

                    {/* Reproductor con Heartbeat Real */}
                    {selectedLesson.video ? (
                      <YouTubeTracker
                        videoId={selectedLesson.video.providerRef}
                        lessonId={selectedLesson.id}
                        minWatchPercentage={classroomData.course.minWatchPercentage}
                        onProgressUpdate={(stats) => {
                          if (stats.isCompleted) {
                            showToast('success', '¡Felicitaciones! Has completado esta lección.');
                            enterClassroom(classroomData.course.slug);
                          }
                        }}
                      />
                    ) : (
                      <div className="aspect-video bg-[#1A1C20] rounded-2xl flex flex-col items-center justify-center text-[#636870] space-y-2">
                        <FileText className="w-8 h-8" />
                        <span className="text-xs">Esta lección no incluye video</span>
                      </div>
                    )}

                    {/* Pestañas de la lección */}
                    <div className="border-t border-[#363940] pt-4 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#555861]">
                        Normas de Aprobación
                      </h4>
                      <p className="text-xs text-[#555861] leading-relaxed">
                        Para registrar tu asistencia debes reproducir al menos el{' '}
                        <strong className="text-white">{classroomData.course.minWatchPercentage}%</strong> del video
                        sin saltar fragmentos. Nuestro sistema guarda automáticamente tu avance mediante pulsos de
                        verificación en bloques de 10 segundos.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#2B2D33] border border-[#363940] rounded-3xl p-12 text-center text-[#555861]">
                    Selecciona una lección del temario para comenzar a estudiar.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VISTA 5: PANEL ADMINISTRATIVO */}
        {activeTab === 'admin' && currentUser && ['admin', 'superadmin'].includes(currentUser.role) && (
          <div className="animate-fade-in">
            <AdminPanel onClose={() => setActiveTab('catalog')} />
          </div>
        )}
      </main>
      </div>

      {/* MODAL DE AUTENTICACIÓN (LOGIN Y REGISTRO CON ACCESO RÁPIDO PARA DEMO) */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#2B2D33] border border-[#363940] rounded-3xl max-w-md w-full p-8 shadow-2xl relative space-y-6">
            <button
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-5 right-5 text-[#555861] hover:text-white transition"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-2xl font-black text-white">
                {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </h3>
              <p className="text-xs text-[#555861]">
                {authMode === 'login'
                  ? 'Ingresa a tu cuenta para acceder a tus cursos'
                  : 'Regístrate para acceder al catálogo completo'}
              </p>
            </div>

            {/* Accesos Rápidos de Demo */}
            <div className="bg-[#1A1C20] p-4 rounded-2xl border border-[#363940] space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-[#555861] tracking-wider flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-[#F2412C]" /> Cuentas de Demostración
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('estudiante@demo.com', 'Estudiante2024!')}
                  className="bg-[#2B2D33] hover:bg-[#363940] text-slate-200 p-2 rounded-xl border border-[#363940] text-left transition"
                >
                  <strong className="block text-[#F2412C]">Estudiante</strong>
                  <span className="text-[10px] text-[#555861]">estudiante@demo.com</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@demo.com', 'Admin2024!')}
                  className="bg-[#2B2D33] hover:bg-[#363940] text-slate-200 p-2 rounded-xl border border-[#363940] text-left transition"
                >
                  <strong className="block text-purple-400">Administrador</strong>
                  <span className="text-[10px] text-[#555861]">admin@demo.com</span>
                </button>
              </div>
            </div>

            {authMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  authMsg.type === 'error'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {authMsg.text}
              </div>
            )}

            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
              {authMode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#555861]">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full bg-[#1A1C20] border border-[#363940] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F2412C]"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#555861]">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="w-full bg-[#1A1C20] border border-[#363940] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F2412C]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#555861]">Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1A1C20] border border-[#363940] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F2412C]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#F2412C] hover:bg-[#F5543F] text-white font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-[#F2412C]/30"
              >
                {authMode === 'login' ? 'Entrar a la Plataforma' : 'Registrarme'}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-[#363940]">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setAuthMsg(null);
                }}
                className="text-xs text-[#F2412C] hover:underline"
              >
                {authMode === 'login'
                  ? '¿No tienes cuenta? Regístrate aquí'
                  : '¿Ya tienes cuenta? Inicia sesión aquí'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
