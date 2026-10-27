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
  AlertCircle
} from 'lucide-react';

import AdminPanel from './AdminPanel';
import YouTubeTracker from './YouTubeTracker';
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
  const [myCourses, setMyCourses] = useState<EnrolledCourse[]>([]);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [classroomData, setClassroomData] = useState<ClassroomData | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<ClassroomLesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<number[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);

  // Auth modal y formulario
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authMsg, setAuthMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

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

  const loadCatalog = async () => {
    try {
      const res = await api('/api/courses');
      if (res.ok) {
        const data = await res.json();
        setCatalog(data);
      }
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    }
  };

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
      const res = await api(`/api/courses/${slug}`);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-md px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-medium transition-all transform animate-bounce-subtle ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-blue-950/90 border-blue-500/50 text-blue-200'
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

      {/* Barra de Navegación Principal */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <button
            onClick={() => setActiveTab('catalog')}
            className="flex items-center gap-3 text-left group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-black text-lg text-white tracking-tight flex items-center gap-1.5">
                AulaPro
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  DEMO
                </span>
              </span>
              <p className="text-[11px] text-slate-400 -mt-0.5">Plataforma de Capacitación</p>
            </div>
          </button>

          {/* Menú de Navegación */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/50 p-1 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'catalog'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Catálogo de Cursos
            </button>

            {currentUser && (
              <button
                onClick={() => {
                  loadMyCourses();
                  setActiveTab('my-courses');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'my-courses'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Layers className="w-4 h-4" />
                Mis Cursos ({myCourses.length})
              </button>
            )}

            {classroomData && (
              <button
                onClick={() => setActiveTab('classroom')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'classroom'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Play className="w-4 h-4 text-emerald-400" />
                Aula Virtual
              </button>
            )}

            {currentUser && ['admin', 'superadmin'].includes(currentUser.role) && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'admin'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-purple-400 hover:text-purple-200 hover:bg-purple-950/30'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Panel Admin
              </button>
            )}
          </nav>
        </div>

        {/* Acciones de Usuario */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-1.5 pr-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center font-bold text-sm text-white">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-white truncate max-w-[140px]">{currentUser.fullName}</p>
                <span className="text-[10px] uppercase font-extrabold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthMode('login');
                setAuthModalOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-blue-600/30 transition hover:scale-102"
            >
              <LogIn className="w-4 h-4" />
              Iniciar Sesión
            </button>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL POR VISTA */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
        {/* VISTA 1: CATÁLOGO DE CURSOS */}
        {activeTab === 'catalog' && (
          <div className="space-y-8 animate-fade-in">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-slate-800 p-8 sm:p-12 shadow-2xl">
              <div className="max-w-2xl space-y-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" /> Capacitación Profesional Certificada
                </span>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                  Aprende a tu ritmo con verificación de progreso real
                </h1>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Sistema interactivo con seguimiento de visualización segundo a segundo y bloqueo secuencial anti-trampa.
                </p>
              </div>
            </div>

            {/* Listado de Cursos */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white">Cursos Disponibles</h2>
                  <p className="text-xs text-slate-400">Selecciona un curso para ver su temario o inscribirte</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {catalog.map((c) => {
                  const isEnrolled = myCourses.some((mc) => mc.courseId === c.id);
                  const isFree = Number(c.price) === 0;

                  return (
                    <div
                      key={c.id}
                      className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-slate-700 transition flex flex-col group shadow-xl"
                    >
                      <div className="h-44 bg-gradient-to-tr from-slate-800 to-slate-700 relative p-6 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <span
                            className={`text-xs font-black px-3 py-1 rounded-xl shadow-md ${
                              isFree
                                ? 'bg-emerald-500 text-white'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {isFree ? 'GRATIS' : `${c.price} ${c.currency}`}
                          </span>
                          <span className="text-[11px] font-bold bg-slate-900/80 backdrop-blur text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
                            Min. {c.minWatchPercentage}%
                          </span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white">
                          <BookOpen className="w-6 h-6" />
                        </div>
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition">
                            {c.title}
                          </h3>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {c.description || 'Domina los conceptos prácticos con este curso integral.'}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
                          <button
                            onClick={() => loadCourseDetail(c.slug)}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
                          >
                            Ver Temario
                          </button>

                          {isEnrolled ? (
                            <button
                              onClick={() => enterClassroom(c.slug)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                            >
                              <Play className="w-3.5 h-3.5" /> Entrar al Aula
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEnrollOrBuy(c.id, c.price)}
                              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
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
            </div>
          </div>
        )}

        {/* VISTA 2: DETALLE DEL CURSO Y TEMARIO */}
        {activeTab === 'course-detail' && courseDetail && (
          <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
            <button
              onClick={() => setActiveTab('catalog')}
              className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-2 transition"
            >
              ← Volver al Catálogo
            </button>

            {/* Cabecera del Curso */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col md:flex-row gap-8 items-start justify-between">
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase px-3 py-1 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {Number(courseDetail.price) === 0 ? 'Curso Gratuito' : `${courseDetail.price} ${courseDetail.currency}`}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Requisito de aprobación: {courseDetail.minWatchPercentage}%
                  </span>
                </div>
                <h1 className="text-3xl font-black text-white">{courseDetail.title}</h1>
                <p className="text-sm text-slate-300 leading-relaxed">{courseDetail.description}</p>
              </div>

              {/* Caja de Acción */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 w-full md:w-80 space-y-4 shrink-0">
                <div className="text-center space-y-1">
                  <span className="text-xs text-slate-400">Inversión</span>
                  <div className="text-3xl font-black text-white">
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
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {Number(courseDetail.price) === 0 ? 'Inscribirme Gratis Ahora' : 'Comprar Curso Ahora'}
                  </button>
                )}
              </div>
            </div>

            {/* Temario de Módulos y Lecciones */}
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white">Temario del Curso</h2>
              <div className="space-y-3">
                {courseDetail.modules.map((m) => (
                  <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-xs text-blue-400">
                          {m.orderIndex}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{m.title}</h3>
                          {m.description && <p className="text-xs text-slate-400">{m.description}</p>}
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        {m.lessons.length} lección(es)
                      </span>
                    </div>

                    <div className="pl-11 space-y-2 border-t border-slate-800/80 pt-3">
                      {m.lessons.map((l) => (
                        <div key={l.id} className="flex items-center justify-between text-xs py-1.5 text-slate-300">
                          <span className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            {l.title}
                          </span>
                          {l.videoDurationSeconds && (
                            <span className="text-slate-500 font-mono text-[11px]">
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

        {/* VISTA 3: MIS CURSOS INSCRITOS */}
        {activeTab === 'my-courses' && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h1 className="text-2xl font-black text-white">Mis Cursos</h1>
              <p className="text-xs text-slate-400">Continúa con tus capacitaciones y revisa tu avance en tiempo real</p>
            </div>

            {myCourses.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">No tienes cursos activos</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Inscríbete a un curso del catálogo para comenzar a aprender de inmediato.
                </p>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition"
                >
                  Explorar Catálogo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myCourses.map((c) => (
                  <div
                    key={c.enrollmentId}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            c.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {c.status === 'completed' ? 'Completado' : 'En Curso'}
                        </span>
                        <span className="text-xs font-bold text-slate-400">{c.progressPercentage}%</span>
                      </div>

                      <h3 className="text-base font-bold text-white">{c.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2">{c.description}</p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-800">
                      {/* Barra de progreso visual */}
                      <div className="space-y-1.5">
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${c.progressPercentage}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>{c.completedLessons} de {c.totalLessons} lecciones aprobadas</span>
                        </div>
                      </div>

                      <button
                        onClick={() => enterClassroom(c.slug)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
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

        {/* VISTA 4: AULA VIRTUAL CON BLOQUEO SECUENCIAL Y REPRODUCTOR */}
        {activeTab === 'classroom' && classroomData && (
          <div className="space-y-6 animate-fade-in">
            {/* Header del Aula */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                  Aula Virtual
                </span>
                <h1 className="text-2xl font-black text-white mt-1">{classroomData.course.title}</h1>
              </div>

              {/* Progreso del curso */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-xs text-slate-400">Progreso Total</span>
                  <div className="text-xl font-black text-white">
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
                  <span className="text-xs bg-slate-800 text-slate-400 font-semibold px-3 py-2 rounded-xl border border-slate-700">
                    {classroomData.overallProgress.completedLessons} / {classroomData.overallProgress.totalLessons} lecciones
                  </span>
                )}
              </div>
            </div>

            {/* Layout Principal: Temario Izquierda + Reproductor Centro/Derecha */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Barra lateral de Temario y Candados */}
              <div className="lg:col-span-4 space-y-3">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" /> Contenido del Curso
                  </h3>

                  <div className="space-y-3">
                    {classroomData.modules.map((m) => {
                      const isExpanded = expandedModules.includes(m.id);

                      return (
                        <div
                          key={m.id}
                          className={`rounded-2xl border transition-all ${
                            m.isLocked
                              ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                              : 'bg-slate-950/90 border-slate-800'
                          }`}
                        >
                          {/* Cabecera del Módulo */}
                          <button
                            onClick={() => !m.isLocked && toggleModule(m.id)}
                            className="w-full text-left p-3.5 flex items-center justify-between gap-3 focus:outline-none"
                          >
                            <div className="flex items-center gap-2.5">
                              {m.isLocked ? (
                                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                              )}
                              <span className="text-xs font-bold text-white line-clamp-1">{m.title}</span>
                            </div>

                            {!m.isLocked && (
                              <ChevronDown
                                className={`w-4 h-4 text-slate-400 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            )}
                          </button>

                          {/* Lecciones del Módulo */}
                          {isExpanded && !m.isLocked && (
                            <div className="px-3 pb-3 space-y-1.5 border-t border-slate-800/80 pt-2">
                              {m.lessons.map((les) => {
                                const isCurrent = selectedLesson?.id === les.id;

                                return (
                                  <button
                                    key={les.id}
                                    onClick={() => !les.isLocked && setSelectedLesson(les)}
                                    disabled={les.isLocked}
                                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition ${
                                      isCurrent
                                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                                        : les.isCompleted
                                        ? 'bg-slate-900/60 hover:bg-slate-800 text-slate-200'
                                        : 'bg-slate-900/40 hover:bg-slate-800 text-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 line-clamp-1">
                                      {les.isCompleted ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                      ) : les.isLocked ? (
                                        <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                      ) : (
                                        <Play className="w-3.5 h-3.5 text-blue-400 shrink-0" />
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
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-blue-400 font-bold">Lección Actual</span>
                        <h2 className="text-xl font-black text-white">{selectedLesson.title}</h2>
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
                      <div className="aspect-video bg-slate-950 rounded-2xl flex flex-col items-center justify-center text-slate-500 space-y-2">
                        <FileText className="w-8 h-8" />
                        <span className="text-xs">Esta lección no incluye video</span>
                      </div>
                    )}

                    {/* Pestañas de la lección */}
                    <div className="border-t border-slate-800 pt-4 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Normas de Aprobación
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Para registrar tu asistencia debes reproducir al menos el{' '}
                        <strong className="text-white">{classroomData.course.minWatchPercentage}%</strong> del video
                        sin saltar fragmentos. Nuestro sistema guarda automáticamente tu avance mediante pulsos de
                        verificación en bloques de 10 segundos.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
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

      {/* MODAL DE AUTENTICACIÓN (LOGIN Y REGISTRO CON ACCESO RÁPIDO PARA DEMO) */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative space-y-6">
            <button
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-2xl font-black text-white">
                {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </h3>
              <p className="text-xs text-slate-400">
                {authMode === 'login'
                  ? 'Ingresa a tu cuenta para acceder a tus cursos'
                  : 'Regístrate para acceder al catálogo completo'}
              </p>
            </div>

            {/* Accesos Rápidos de Demo */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-blue-400" /> Cuentas de Demostración
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('estudiante@demo.com', 'Estudiante2024!')}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-200 p-2 rounded-xl border border-slate-800 text-left transition"
                >
                  <strong className="block text-blue-400">Estudiante</strong>
                  <span className="text-[10px] text-slate-400">estudiante@demo.com</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@demo.com', 'Admin2024!')}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-200 p-2 rounded-xl border border-slate-800 text-left transition"
                >
                  <strong className="block text-purple-400">Administrador</strong>
                  <span className="text-[10px] text-slate-400">admin@demo.com</span>
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
                  <label className="text-xs font-bold text-slate-300">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-blue-600/30"
              >
                {authMode === 'login' ? 'Entrar a la Plataforma' : 'Registrarme'}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setAuthMsg(null);
                }}
                className="text-xs text-blue-400 hover:underline"
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
