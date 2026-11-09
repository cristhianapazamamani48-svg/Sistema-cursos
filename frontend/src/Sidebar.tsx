import React from 'react';
import {
  BookOpen,
  Layers,
  PlusCircle,
  ShieldCheck,
  Play,
  LogOut,
  LogIn,
  GraduationCap,
  X
} from 'lucide-react';

export interface SidebarProps {
  currentUser: {
    id: number;
    email: string;
    fullName: string;
    role: string;
  } | null;
  activeTab: 'catalog' | 'course-detail' | 'my-courses' | 'classroom' | 'admin';
  isCreatingCourse?: boolean;
  hasActiveClassroom?: boolean;
  onNavigate: (tab: 'catalog' | 'my-courses' | 'classroom' | 'admin') => void;
  onCreateCourse: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  currentUser,
  activeTab,
  isCreatingCourse = false,
  hasActiveClassroom = false,
  onNavigate,
  onCreateCourse,
  onOpenAuth,
  onLogout,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  // Ítems de navegación dinámicos según rol
  const role = currentUser?.role;
  const isEstudiante = role === 'estudiante';
  const isDocente = role === 'docente';
  const isAdmin = role === 'admin' || role === 'superadmin';

  const navItems = [
    {
      id: 'catalog',
      label: 'Catálogo',
      icon: BookOpen,
      isActive: (activeTab === 'catalog' || activeTab === 'course-detail') && !isCreatingCourse,
      onClick: () => {
        onNavigate('catalog');
        onCloseMobile();
      },
      show: true, // visible para todos
    },
    {
      id: 'my-courses',
      label: 'Mis Cursos',
      icon: Layers,
      isActive: activeTab === 'my-courses' && !isCreatingCourse,
      onClick: () => {
        onNavigate('my-courses');
        onCloseMobile();
      },
      show: !!currentUser, // Estudiante, Docente, Admin
    },
    {
      id: 'create-course',
      label: 'Crear Cursos',
      icon: PlusCircle,
      isActive: isCreatingCourse,
      onClick: () => {
        onCreateCourse();
        onCloseMobile();
      },
      show: isDocente || isAdmin, // Docente y Admin
    },
    {
      id: 'admin',
      label: 'Panel Admin',
      icon: ShieldCheck,
      isActive: activeTab === 'admin' && !isCreatingCourse,
      onClick: () => {
        onNavigate('admin');
        onCloseMobile();
      },
      show: isAdmin, // Solo Admin
    },
    {
      id: 'classroom',
      label: 'Aula Virtual',
      icon: Play,
      isActive: activeTab === 'classroom' && !isCreatingCourse,
      onClick: () => {
        onNavigate('classroom');
        onCloseMobile();
      },
      show: hasActiveClassroom, // Acceso directo al aula en curso
    },
  ].filter((item) => item.show);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#2B2D33] text-[#E4E6EA] border-r border-[#363940] select-none">
      {/* 1. LOGO Y BRANDING */}
      <div className="p-5 border-b border-[#363940] flex items-center justify-between">
        <button
          onClick={() => {
            onNavigate('catalog');
            onCloseMobile();
          }}
          className="flex items-center gap-3 text-left group focus:outline-none cursor-pointer"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#F2412C] flex items-center justify-center text-white shadow-md shadow-[#F2412C]/25 group-hover:scale-105 transition shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="font-black text-base text-white tracking-tight flex items-center gap-1.5">
              EducaSuite 360
            </span>
            <p className="text-[10px] font-bold text-[#E4E6EA]/60 uppercase tracking-wider">
              Plataforma Digital
            </p>
          </div>
        </button>

        {/* Botón cerrar en móvil */}
        <button
          onClick={onCloseMobile}
          className="md:hidden p-2 rounded-xl text-[#9EA3AC] hover:text-white hover:bg-[#363940] transition cursor-pointer"
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. MENÚ DE NAVEGACIÓN */}
      <div className="flex-1 py-6 px-3.5 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-[#9EA3AC]/70">
          Navegación
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-xs font-bold transition duration-150 cursor-pointer text-left ${
                item.isActive
                  ? 'bg-[#F2412C] text-white shadow-md shadow-[#F2412C]/20'
                  : 'text-[#E4E6EA]/80 hover:text-white hover:bg-[#363940]'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition ${
                  item.isActive ? 'text-white' : 'text-[#9EA3AC]'
                }`}
              />
              <span className="truncate">{item.label}</span>
              {item.isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. USUARIO / CERRAR SESIÓN (ABAJO) */}
      <div className="p-3.5 border-t border-[#363940] bg-[#24262B]">
        {currentUser ? (
          <div className="flex items-center justify-between gap-2.5 p-2 rounded-2xl bg-[#2B2D33] border border-[#363940]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#363940] text-white flex items-center justify-center font-black text-sm shrink-0 border border-white/10">
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate" title={currentUser.fullName}>
                  {currentUser.fullName}
                </p>
                <span className="inline-block text-[9px] uppercase font-extrabold text-[#F2412C] bg-[#F2412C]/10 px-1.5 py-0.2 rounded border border-[#F2412C]/20">
                  {currentUser.role}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                onLogout();
                onCloseMobile();
              }}
              title="Cerrar sesión"
              className="p-2 rounded-xl text-[#9EA3AC] hover:text-[#F2412C] hover:bg-[#363940] transition cursor-pointer shrink-0"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              onOpenAuth();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 bg-[#F2412C] hover:bg-[#D93522] text-white text-xs font-bold py-3 px-4 rounded-2xl shadow-md shadow-[#F2412C]/20 transition cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Iniciar Sesión</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* SIDEBAR ESCRITORIO (FIJO A LA IZQUIERDA) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 z-30 flex-col">
        {sidebarContent}
      </aside>

      {/* MENÚ HAMBURGUESA / DRAWER MÓVIL */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop con desenfoque suave */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-[#2B2D33]/70 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Panel Lateral Desplegable */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-fade-in">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

