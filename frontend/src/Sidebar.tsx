import React from 'react';
import {
  BookOpen,
  Layers,
  CreditCard,
  PlusCircle,
  LayoutDashboard,
  Video,
  Users,
  Play,
  LogOut,
  LogIn,
  GraduationCap,
  X,
} from 'lucide-react';

export type AppTab =
  | 'catalog'
  | 'course-detail'
  | 'my-courses'
  | 'my-orders'
  | 'teacher-courses'
  | 'create-course'
  | 'classroom'
  | 'admin';

export type AdminSubTab = 'summary' | 'orders' | 'videos' | 'users' | 'courses';

export interface SidebarProps {
  currentUser: {
    id: number;
    email: string;
    fullName: string;
    role: string;
  } | null;
  activeTab: AppTab;
  adminTab?: AdminSubTab;
  isCreatingCourse?: boolean;
  hasActiveClassroom?: boolean;
  onNavigate: (tab: AppTab, adminSubTab?: AdminSubTab) => void;
  onCreateCourse: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  currentUser,
  activeTab,
  adminTab = 'summary',
  isCreatingCourse = false,
  hasActiveClassroom = false,
  onNavigate,
  onCreateCourse,
  onOpenAuth,
  onLogout,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const role = currentUser?.role;
  const isEstudiante = role === 'estudiante' || role === 'student';
  const isDocente = role === 'docente' || role === 'teacher';
  const isAdmin = role === 'admin' || role === 'superadmin';
  const isVisitante = !currentUser;

  // Manejo del clic en el logo según el rol
  const handleLogoClick = () => {
    if (isDocente) {
      onNavigate('teacher-courses');
    } else if (isAdmin) {
      onNavigate('admin', 'summary');
    } else if (isEstudiante) {
      onNavigate('my-courses');
    } else {
      onNavigate('catalog');
    }
    onCloseMobile();
  };

  // Definición de ítems según rol (Tarea B)
  let navItems: {
    id: string;
    label: string;
    icon: any;
    isActive: boolean;
    onClick: () => void;
  }[] = [];

  if (isVisitante) {
    // Visitante: solo Catálogo e Iniciar sesión
    navItems = [
      {
        id: 'catalog',
        label: 'Catálogo',
        icon: BookOpen,
        isActive: activeTab === 'catalog' || activeTab === 'course-detail',
        onClick: () => {
          onNavigate('catalog');
          onCloseMobile();
        },
      },
    ];
  } else if (isEstudiante) {
    // Estudiante: Catálogo, Mis cursos, Mis pagos (+ Aula si hay activa)
    navItems = [
      {
        id: 'catalog',
        label: 'Catálogo',
        icon: BookOpen,
        isActive: activeTab === 'catalog' || activeTab === 'course-detail',
        onClick: () => {
          onNavigate('catalog');
          onCloseMobile();
        },
      },
      {
        id: 'my-courses',
        label: 'Mis Cursos',
        icon: Layers,
        isActive: activeTab === 'my-courses',
        onClick: () => {
          onNavigate('my-courses');
          onCloseMobile();
        },
      },
      {
        id: 'my-orders',
        label: 'Mis Pagos',
        icon: CreditCard,
        isActive: activeTab === 'my-orders',
        onClick: () => {
          onNavigate('my-orders');
          onCloseMobile();
        },
      },
    ];

    if (hasActiveClassroom) {
      navItems.push({
        id: 'classroom',
        label: 'Aula Virtual',
        icon: Play,
        isActive: activeTab === 'classroom',
        onClick: () => {
          onNavigate('classroom');
          onCloseMobile();
        },
      });
    }
  } else if (isDocente) {
    // Docente: Mis cursos (los que creó) y Crear curso, sin Catálogo comprador
    navItems = [
      {
        id: 'teacher-courses',
        label: 'Mis Cursos',
        icon: Layers,
        isActive: activeTab === 'teacher-courses' && !isCreatingCourse,
        onClick: () => {
          onNavigate('teacher-courses');
          onCloseMobile();
        },
      },
      {
        id: 'create-course',
        label: 'Crear Curso',
        icon: PlusCircle,
        isActive: isCreatingCourse || activeTab === 'create-course',
        onClick: () => {
          onCreateCourse();
          onCloseMobile();
        },
      },
    ];
  } else if (isAdmin) {
    // Admin y superadmin: solo Resumen, Pagos, Videos, Usuarios y Cursos, sin Mis cursos ni Crear curso
    navItems = [
      {
        id: 'admin-summary',
        label: 'Resumen',
        icon: LayoutDashboard,
        isActive: activeTab === 'admin' && (adminTab === 'summary' || !adminTab),
        onClick: () => {
          onNavigate('admin', 'summary');
          onCloseMobile();
        },
      },
      {
        id: 'admin-orders',
        label: 'Pagos',
        icon: CreditCard,
        isActive: activeTab === 'admin' && adminTab === 'orders',
        onClick: () => {
          onNavigate('admin', 'orders');
          onCloseMobile();
        },
      },
      {
        id: 'admin-videos',
        label: 'Videos',
        icon: Video,
        isActive: activeTab === 'admin' && adminTab === 'videos',
        onClick: () => {
          onNavigate('admin', 'videos');
          onCloseMobile();
        },
      },
      {
        id: 'admin-users',
        label: 'Usuarios',
        icon: Users,
        isActive: activeTab === 'admin' && adminTab === 'users',
        onClick: () => {
          onNavigate('admin', 'users');
          onCloseMobile();
        },
      },
      {
        id: 'admin-courses',
        label: 'Cursos',
        icon: BookOpen,
        isActive: activeTab === 'admin' && adminTab === 'courses',
        onClick: () => {
          onNavigate('admin', 'courses');
          onCloseMobile();
        },
      },
    ];
  }

  const roleBadgeLabel = () => {
    if (isAdmin) return 'Administrador';
    if (isDocente) return 'Docente';
    if (isEstudiante) return 'Estudiante';
    return 'Visitante';
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#2B2D33] text-[#E4E6EA] border-r border-[#363940] select-none">
      {/* 1. LOGO Y BRANDING */}
      <div className="p-5 border-b border-[#363940] flex items-center justify-between">
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#F2412C] flex items-center justify-center text-white shadow-md shadow-[#F2412C]/20 group-hover:scale-105 transition">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="font-black text-base text-white tracking-tight flex items-center gap-1.5">
              EducaSuite 360
            </span>
            <p className="text-[10px] font-bold text-[#E4E6EA]/60 uppercase tracking-wider">
              {roleBadgeLabel()}
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
                className={`w-4 h-4 shrink-0 ${
                  item.isActive ? 'text-white stroke-[2.5]' : 'text-[#9EA3AC]'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. PIE DEL SIDEBAR: USUARIO / CERRAR SESIÓN / INICIAR SESIÓN */}
      <div className="p-4 border-t border-[#363940] bg-[#24262B]">
        {currentUser ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#F2412C] flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm">
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {currentUser.fullName || 'Usuario'}
                </p>
                <p className="text-[11px] text-[#9EA3AC] truncate leading-tight mt-0.5">
                  {currentUser.email}
                </p>
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
