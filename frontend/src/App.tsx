import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  Lock, 
  Play, 
  FileText, 
  Download, 
  ChevronDown, 
  ChevronRight, 
  LogIn, 
  UserPlus, 
  LogOut, 
  Sparkles,
  Award,
  Video,
  Clock,
  LayoutDashboard,
  HelpCircle,
  Menu,
  X,
  Mail,
  Eye,
  EyeOff,
  Moon,
  Sun,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Boxes,
  Layers,
  GraduationCap,
  FolderClosed,
  Settings,
  Flame,
  Check
} from 'lucide-react';

import AdminPanel from './AdminPanel';
import YouTubeTracker from './YouTubeTracker';

interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

interface Lesson {
  id: number;
  title: string;
  duration: string;
  isCompleted: boolean;
  isLocked: boolean;
  currentProgressPct: number;
  videoRef: string;
}

interface Module {
  id: number;
  title: string;
  isLocked: boolean;
  lessons: Lesson[];
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'classroom' | 'login' | 'register' | 'admin'>('classroom');

  // Modal Auth View State (Login vs Register en la tarjeta de dos paneles)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Lección activa
  const [selectedLessonId, setSelectedLessonId] = useState<number>(1);
  const [expandedModules, setExpandedModules] = useState<number[]>([1, 2]);

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Módulos con bloqueo secuencial
  const [modulesList, setModulesList] = useState<Module[]>([
    {
      id: 1,
      title: 'Módulo 1: Fundamentos y Conceptos Clave',
      isLocked: false,
      lessons: [
        {
          id: 1,
          title: '01. Introducción al curso y metodología',
          duration: '12:45 min',
          isCompleted: true,
          isLocked: false,
          currentProgressPct: 100,
          videoRef: 'dQw4w9WgXcQ',
        },
        {
          id: 2,
          title: '02. Configuración del entorno de trabajo',
          duration: '18:20 min',
          isCompleted: true,
          isLocked: false,
          currentProgressPct: 100,
          videoRef: 'dQw4w9WgXcQ',
        },
        {
          id: 3,
          title: '03. Arquitectura y primeros pasos',
          duration: '15:10 min',
          isCompleted: false,
          isLocked: false,
          currentProgressPct: 65,
          videoRef: 'dQw4w9WgXcQ',
        },
      ],
    },
    {
      id: 2,
      title: 'Módulo 2: Implementación Práctica y Casos Reales',
      isLocked: false,
      lessons: [
        {
          id: 4,
          title: '04. Estructura de datos y lógica base',
          duration: '22:30 min',
          isCompleted: false,
          isLocked: false,
          currentProgressPct: 0,
          videoRef: 'dQw4w9WgXcQ',
        },
        {
          id: 5,
          title: '05. Casos de estudio y resolución de problemas',
          duration: '25:00 min',
          isCompleted: false,
          isLocked: false,
          currentProgressPct: 0,
          videoRef: 'dQw4w9WgXcQ',
        },
      ],
    },
    {
      id: 3,
      title: 'Módulo 3: Proyecto Final y Certificación',
      isLocked: true,
      lessons: [
        {
          id: 6,
          title: '06. Evaluación y entrega del proyecto',
          duration: '30:00 min',
          isCompleted: false,
          isLocked: true,
          currentProgressPct: 0,
          videoRef: 'dQw4w9WgXcQ',
        },
        {
          id: 7,
          title: '07. Cierre del curso y emisión de certificado',
          duration: '10:15 min',
          isCompleted: false,
          isLocked: true,
          currentProgressPct: 0,
          videoRef: 'dQw4w9WgXcQ',
        },
      ],
    },
  ]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setCsrfToken(data.csrfToken || '');
      }
    } catch {
      setCurrentUser(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al iniciar sesión');
      setCurrentUser(data.user);
      setCsrfToken(data.csrfToken || '');
      setActiveTab('classroom');
      setEmail('');
      setPassword('');
      setMsg({ type: 'success', text: `¡Bienvenido de vuelta, ${data.user.fullName}!` });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error en el registro');
      setMsg({ type: 'success', text: '¡Cuenta creada! Ya puedes iniciar sesión con tus datos.' });
      setAuthMode('login');
      setPassword('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      setMsg({ type: 'success', text: 'Sesión finalizada con éxito' });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleModule = (modId: number) => {
    setExpandedModules((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  const currentLesson = modulesList
    .flatMap((m) => m.lessons)
    .find((l) => l.id === selectedLessonId) || modulesList[0].lessons[0];

  const allLessons = modulesList.flatMap((m) => m.lessons);
  const completedLessonsCount = allLessons.filter((l) => l.isCompleted).length;
  const overallPercentage = Math.round((completedLessonsCount / allLessons.length) * 100);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#1e293b] flex flex-col font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* HEADER MINIMALISTA */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
        <div className="w-full px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Alternar panel"
            >
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>

            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setActiveTab('classroom')}
            >
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Boxes className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                  CURSOS ONLINE
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                    Plataforma
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                {(currentUser.role === 'admin' || currentUser.role === 'superadmin') && (
                  <button
                    onClick={() => setActiveTab(activeTab === 'admin' ? 'classroom' : 'admin')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'admin'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{activeTab === 'admin' ? 'Ver Aula' : 'Panel Admin'}</span>
                  </button>
                )}

                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-slate-800">{currentUser.fullName}</div>
                  <div className="text-xs text-blue-600 font-semibold capitalize">{currentUser.role}</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-blue-100 border-2 border-white shadow-sm text-blue-700 font-bold flex items-center justify-center text-xs">
                  {currentUser.fullName.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setActiveTab('login'); setAuthMode('login'); }}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition flex items-center gap-2"
              >
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                Acceder al Curso
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CUERPO PRINCIPAL FULL-WIDTH */}
      <div className="flex-1 w-full px-4 sm:px-6 py-4 flex gap-6 overflow-hidden">
        
        {/* PANEL IZQUIERDO: FLOATING CARD CON ESQUINAS EXTRA REDONDEADAS (Inspirado en Imagen 1) */}
        {activeTab === 'classroom' && sidebarOpen && (
          <aside className="w-80 lg:w-88 flex-shrink-0 flex flex-col transition-all duration-300">
            <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-xl shadow-slate-200/50 flex flex-col h-[calc(100vh-7.5rem)] sticky top-20 overflow-hidden">
              
              {/* Header del Panel Lateral */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
                    <Boxes className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="font-black text-sm tracking-widest text-slate-900 uppercase">
                    CONTENIDO
                  </span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              {/* Usuario Perfil Flotante (Como en la foto 1: Ajendra S. UI/UX Designer) */}
              <div className="py-5 flex items-center gap-3.5 border-b border-slate-100">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-white shadow-md flex items-center justify-center text-slate-700 font-bold text-base overflow-hidden">
                    {currentUser ? (
                      currentUser.fullName.charAt(0).toUpperCase()
                    ) : (
                      <span className="text-slate-400">👤</span>
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-sm text-slate-800 truncate">
                    {currentUser ? currentUser.fullName : 'Estudiante Demo'}
                  </div>
                  <div className="text-xs text-slate-400 font-medium truncate">
                    {currentUser ? currentUser.email : 'Inscripción Activa'}
                  </div>
                </div>
              </div>

              {/* Lista de Módulos y Lecciones */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 scrollbar-thin">
                <div className="flex items-center justify-between text-xs px-1 text-slate-400 font-bold uppercase tracking-wider">
                  <span>Módulos del Curso</span>
                  <span className="text-blue-600 font-bold">{overallPercentage}%</span>
                </div>

                {modulesList.map((mod, idx) => {
                  const isExpanded = expandedModules.includes(mod.id);
                  const isModuleActive = mod.lessons.some((l) => l.id === selectedLessonId);

                  return (
                    <div key={mod.id} className="rounded-2xl transition overflow-hidden">
                      {/* Botón Módulo estilo Menú */}
                      <button
                        onClick={() => !mod.isLocked && toggleModule(mod.id)}
                        disabled={mod.isLocked}
                        className={`w-full px-3 py-3 rounded-2xl flex items-center justify-between text-left transition ${
                          isModuleActive && !mod.isLocked
                            ? 'text-blue-600 font-bold'
                            : mod.isLocked
                            ? 'text-slate-400 opacity-60 cursor-not-allowed'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          {mod.isLocked ? (
                            <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          ) : (
                            <Layers className={`w-4 h-4 flex-shrink-0 ${isModuleActive ? 'text-blue-600' : 'text-slate-400'}`} />
                          )}
                          <span className="text-xs truncate">{mod.title}</span>
                        </div>

                        {/* Indicador azul a la derecha como en la Imagen 1 */}
                        {isModuleActive && !mod.isLocked ? (
                          <div className="w-2 h-5 rounded-full bg-blue-600 flex-shrink-0"></div>
                        ) : !mod.isLocked ? (
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        ) : null}
                      </button>

                      {/* Lecciones Anidadas */}
                      {isExpanded && !mod.isLocked && (
                        <div className="pl-4 pr-1 py-1 space-y-1">
                          {mod.lessons.map((lesson) => {
                            const isSelected = selectedLessonId === lesson.id;
                            return (
                              <button
                                key={lesson.id}
                                onClick={() => setSelectedLessonId(lesson.id)}
                                className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition text-xs ${
                                  isSelected
                                    ? 'bg-blue-50/80 text-blue-600 font-bold'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  {lesson.isCompleted ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                  ) : isSelected ? (
                                    <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600 flex-shrink-0" />
                                  ) : (
                                    <Circle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                                  )}
                                  <span className="truncate">{lesson.title}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">
                                  {lesson.duration.split(' ')[0]}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pie del Panel Lateral (Logout & Dark Mode switch como en Imagen 1) */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>

                <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-3">
                    <Moon className="w-4 h-4 text-slate-400" />
                    <span>Modo Oscuro</span>
                  </div>
                  <div className="w-10 h-5 bg-slate-200 rounded-full relative cursor-pointer flex items-center p-0.5">
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs"></div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* ÁREA CENTRAL: REPRODUCTOR O MODAL DE LOGIN */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {msg && (
            <div
              className={`mb-6 p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between ${
                msg.type === 'success'
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span>{msg.text}</span>
              <button onClick={() => setMsg(null)} className="text-xs font-bold underline ml-4">
                Cerrar
              </button>
            </div>
          )}

          {activeTab === 'classroom' && (
            <div className="space-y-6">
              {/* Tarjeta Flotante del Reproductor */}
              <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-xl shadow-slate-200/50 space-y-6">
                
                {/* Reproductor Interactivo con Tracking Automático de YouTube */}
                <YouTubeTracker
                  key={`${selectedLessonId}-${currentLesson.videoRef}`}
                  videoId={currentLesson.videoRef}
                  lessonId={selectedLessonId}
                  minWatchPercentage={85}
                  onProgressUpdate={(stats) => {
                    setModulesList((prev) =>
                      prev.map((mod) => ({
                        ...mod,
                        lessons: mod.lessons.map((l) =>
                          l.id === selectedLessonId
                            ? {
                                ...l,
                                isCompleted: stats.isCompleted,
                                currentProgressPct: stats.currentWatchPercentage,
                              }
                            : l
                        ),
                      }))
                    );
                  }}
                />

                {/* Info Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      Lección en reproducción
                    </span>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                      {currentLesson.title}
                    </h1>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Piso de Aprobación:</span>
                    <span className="text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl">
                      85% Visto
                    </span>
                  </div>
                </div>

                {/* Descripción */}
                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                  En esta lección se desarrollan los conceptos clave del módulo. Puedes reproducir a cualquier velocidad
                  (hasta 2x). El progreso se registra automáticamente en el servidor mediante bloques de 10 segundos.
                </p>

                {/* Recursos */}
                <div className="pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" /> Material Adjunto
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between hover:bg-blue-50/50 hover:border-blue-200 transition cursor-pointer">
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          PDF
                        </div>
                        <span className="text-xs font-semibold text-slate-700 truncate">
                          Guia_Estudio_Modulo_1.pdf
                        </span>
                      </div>
                      <Download className="w-4 h-4 text-slate-400 hover:text-blue-600" />
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between hover:bg-blue-50/50 hover:border-blue-200 transition cursor-pointer">
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          XLS
                        </div>
                        <span className="text-xs font-semibold text-slate-700 truncate">
                          Plantilla_Ejercicios.xlsx
                        </span>
                      </div>
                      <Download className="w-4 h-4 text-slate-400 hover:text-emerald-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: PANEL DE ADMINISTRACIÓN (PAGOS Y AUDITORÍA DE VIDEOS) */}
          {activeTab === 'admin' && (
            <AdminPanel
              onClose={() => setActiveTab('classroom')}
              csrfToken={csrfToken}
            />
          )}

          {/* VISTA 3: LOGIN / REGISTER CARD DE DOBLE PANEL (Inspirado en Imagen 2) */}
          {(activeTab === 'login' || activeTab === 'register') && (
            <div className="flex-1 flex items-center justify-center py-6">
              <div className="w-full max-w-4xl bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/80 overflow-hidden flex flex-col md:flex-row">
                
                {/* Panel Izquierdo del Formulario (Inputs redondeados gris suave) */}
                <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-between">
                  <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      {authMode === 'login' ? 'Login' : 'Sign Up'}
                    </h2>

                    <form
                      onSubmit={authMode === 'login' ? handleLogin : handleRegister}
                      className="mt-8 space-y-4"
                    >
                      {authMode === 'register' && (
                        <div>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Nombre Completo"
                              className="w-full px-4 py-3.5 rounded-2xl bg-slate-100/80 border-0 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-100/80 border-0 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-slate-100/80 border-0 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Remember me checkbox */}
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded-md accent-[#0f2327] cursor-pointer"
                          />
                          <span>Remember me</span>
                        </label>
                        <a href="#" className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                          Forgot password?
                        </a>
                      </div>

                      {/* Botón Principal Login / Sign Up */}
                      <button
                        type="submit"
                        className="w-full py-3.5 rounded-2xl font-bold text-sm bg-[#0a1e24] hover:bg-[#132c34] text-white shadow-lg shadow-slate-900/10 transition mt-2 cursor-pointer"
                      >
                        {authMode === 'login' ? 'Login' : 'Create Account'}
                      </button>

                      {/* Separador Or */}
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white px-3 text-slate-400 font-bold">Or</span>
                        </div>
                      </div>

                      {/* Botón Social Login */}
                      <button
                        type="button"
                        onClick={() => alert('Autenticación con Google disponible próximamente')}
                        className="w-full py-3.5 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 font-bold text-sm flex items-center justify-center gap-3 transition cursor-pointer"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </button>
                    </form>
                  </div>

                  <p className="mt-8 text-center text-[11px] text-slate-400 leading-relaxed">
                    By logging into the application, you are agreeing to the{' '}
                    <span className="underline cursor-pointer">Terms & Conditions</span> and{' '}
                    <span className="underline cursor-pointer">Privacy Policy</span>.
                  </p>
                </div>

                {/* Panel Derecho Gradiente Azul/Cian Oscuro (Exacto como en Imagen 2) */}
                <div className="w-full md:w-1/2 bg-gradient-to-br from-[#062026] via-[#0d343c] to-[#1c5d6b] p-8 sm:p-12 flex flex-col items-center justify-center text-center text-white relative">
                  <div className="max-w-xs space-y-4">
                    <h3 className="text-3xl font-extrabold tracking-tight">
                      {authMode === 'login' ? 'Hello there' : 'Welcome back'}
                    </h3>
                    <p className="text-sm font-medium text-slate-300 leading-relaxed">
                      {authMode === 'login'
                        ? 'Begin your learning journey using this platform, and start mastering new skills today.'
                        : 'Already have an account? Sign in to resume your lessons and track your progress.'}
                    </p>

                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode(authMode === 'login' ? 'register' : 'login');
                          setMsg(null);
                        }}
                        className="px-8 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm backdrop-blur-sm transition cursor-pointer"
                      >
                        {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                      </button>
                    </div>
                  </div>

                  {/* Botón flotante para regresar al aula */}
                  <button
                    onClick={() => setActiveTab('classroom')}
                    className="absolute top-6 right-6 text-xs text-white/60 hover:text-white flex items-center gap-1 font-semibold"
                  >
                    <span>Volver al aula</span> &times;
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
