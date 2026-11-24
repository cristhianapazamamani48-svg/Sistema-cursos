import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  FileText,
  Image,
  Lock,
  Eye,
  EyeOff,
  BookOpen,
  CheckCircle2,
  Award,
  Save,
  ShieldCheck,
  Calendar,
  BarChart2,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { api } from './api';

interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  createdAt: string;
  stats: {
    enrollments: number;
    completedCourses: number;
    certificates: number;
  };
}

type ProfileTab = 'personal' | 'security' | 'activity';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  docente: 'Docente',
  estudiante: 'Estudiante',
};

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  docente: 'bg-amber-100 text-amber-700',
  estudiante: 'bg-green-100 text-green-700',
};

interface Props {
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
  onProfileUpdated: () => void;
}

export default function UserProfileView({ showToast, onProfileUpdated }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');

  // Personal form
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api('/api/users/me');
      if (!res.ok) throw new Error('Error al cargar perfil');
      const data: UserProfile = await res.json();
      setProfile(data);
      setFullName(data.fullName ?? '');
      setBio(data.bio ?? '');
      setPhone(data.phone ?? '');
      setAvatarUrl(data.avatarUrl ?? '');
    } catch {
      showToast('error', 'No se pudo cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return showToast('error', 'El nombre es obligatorio');
    setSavingProfile(true);
    try {
      const res = await api('/api/users/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, bio, phone, avatarUrl }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message ?? 'Error al actualizar perfil');
      }
      const updated: UserProfile = await res.json();
      setProfile(updated);
      setFullName(updated.fullName ?? '');
      showToast('success', 'Perfil actualizado correctamente');
      onProfileUpdated();
    } catch (err: any) {
      showToast('error', err?.message ?? 'Error al actualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword)
      return showToast('error', 'Completa todos los campos');
    if (newPassword.length < 8)
      return showToast('error', 'La nueva contraseña debe tener al menos 8 caracteres');
    if (newPassword !== confirmPassword)
      return showToast('error', 'Las contraseñas no coinciden');
    setSavingPassword(true);
    try {
      const res = await api('/api/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message ?? 'Error al cambiar contraseña');
      }
      showToast('success', 'Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast('error', err?.message ?? 'Error al cambiar contraseña');
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = (name: string) =>
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'personal', label: 'Información Personal', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'security', label: 'Seguridad', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'activity', label: 'Mi Actividad', icon: <BarChart2 className="w-3.5 h-3.5" /> },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 text-[#F2412C] animate-spin" />
        <p className="text-xs text-[#555861]">Cargando perfil…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-[#D1D5DB] rounded-3xl p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#F2412C] flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-black text-[#2B2D33]">No se pudo cargar la información del perfil</h3>
          <p className="text-xs text-[#555861]">Hubo un inconveniente al consultar tu información. Por favor, reintenta.</p>
        </div>
        <button
          onClick={loadProfile}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F2412C] hover:bg-[#d93520] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reintentar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* ---- HEADER ---- */}
      <div className="bg-white border border-[#D1D5DB] rounded-3xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 shadow-xs">
        {/* Avatar */}
        <div className="shrink-0">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.fullName}
              className="w-20 h-20 rounded-full object-cover border-2 border-[#F2412C] shadow"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F2412C] to-[#ff6b55] flex items-center justify-center shadow">
              <span className="text-white text-2xl font-black">
                {initials(profile.fullName)}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left space-y-1.5">
          <h1 className="text-lg font-black text-[#2B2D33] leading-tight">{profile.fullName}</h1>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start items-center">
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${ROLE_COLORS[profile.role] ?? 'bg-gray-100 text-gray-700'}`}
            >
              {ROLE_LABELS[profile.role] ?? profile.role}
            </span>
          </div>
          <p className="text-xs text-[#555861] flex items-center gap-1 justify-center sm:justify-start">
            <Mail className="w-3 h-3" />
            {profile.email}
          </p>
          <p className="text-xs text-[#555861] flex items-center gap-1 justify-center sm:justify-start">
            <Calendar className="w-3 h-3" />
            Miembro desde {formatDate(profile.createdAt)}
          </p>
        </div>
      </div>

      {/* ---- TABS ---- */}
      <div className="flex gap-1 bg-[#F8F9FA] border border-[#E4E6EA] rounded-2xl p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === t.id
                ? 'bg-white text-[#F2412C] shadow-xs border border-[#E4E6EA]'
                : 'text-[#555861] hover:text-[#2B2D33]'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ---- TAB: PERSONAL ---- */}
      {activeTab === 'personal' && (
        <form
          onSubmit={handleSaveProfile}
          className="bg-white border border-[#D1D5DB] rounded-3xl p-6 shadow-xs space-y-5"
        >
          <h2 className="text-sm font-black text-[#2B2D33] flex items-center gap-2">
            <User className="w-4 h-4 text-[#F2412C]" />
            Información Personal
          </h2>

          {/* Nombre */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#2B2D33]">Nombre Completo *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555861]" />
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-[#D1D5DB] rounded-xl text-xs text-[#2B2D33] focus:outline-none focus:ring-2 focus:ring-[#F2412C]/30 focus:border-[#F2412C] transition"
                placeholder="Tu nombre completo"
              />
            </div>
          </div>

          {/* Email (readonly) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#2B2D33]">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555861]" />
              <input
                value={profile.email}
                readOnly
                className="w-full pl-9 pr-4 py-2.5 border border-[#E4E6EA] rounded-xl text-xs text-[#555861] bg-[#F8F9FA] cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-[#555861]">El correo no se puede cambiar</p>
          </div>

          {/* Teléfono */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#2B2D33]">Teléfono</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555861]" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-[#D1D5DB] rounded-xl text-xs text-[#2B2D33] focus:outline-none focus:ring-2 focus:ring-[#F2412C]/30 focus:border-[#F2412C] transition"
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          {/* Avatar URL */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#2B2D33]">URL de Foto de Perfil</label>
            <div className="relative">
              <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555861]" />
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-[#D1D5DB] rounded-xl text-xs text-[#2B2D33] focus:outline-none focus:ring-2 focus:ring-[#F2412C]/30 focus:border-[#F2412C] transition"
                placeholder="https://ejemplo.com/mi-foto.jpg"
              />
            </div>
            {avatarUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={avatarUrl}
                  alt="Vista previa"
                  className="w-10 h-10 rounded-full object-cover border border-[#D1D5DB]"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
                <span className="text-[10px] text-[#555861]">Vista previa</span>
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#2B2D33]">Biografía</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-3.5 h-3.5 text-[#555861]" />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full pl-9 pr-4 py-2.5 border border-[#D1D5DB] rounded-xl text-xs text-[#2B2D33] focus:outline-none focus:ring-2 focus:ring-[#F2412C]/30 focus:border-[#F2412C] transition resize-none"
                placeholder="Cuéntanos un poco sobre ti…"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#F2412C] hover:bg-[#d93520] text-white text-xs font-black rounded-2xl transition cursor-pointer disabled:opacity-60"
          >
            {savingProfile ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {savingProfile ? 'Guardando…' : 'Guardar Cambios'}
          </button>
        </form>
      )}

      {/* ---- TAB: SECURITY ---- */}
      {activeTab === 'security' && (
        <form
          onSubmit={handleChangePassword}
          className="bg-white border border-[#D1D5DB] rounded-3xl p-6 shadow-xs space-y-5"
        >
          <h2 className="text-sm font-black text-[#2B2D33] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#F2412C]" />
            Cambiar Contraseña
          </h2>

          {/* Reglas */}
          <div className="bg-[#F8F9FA] border border-[#E4E6EA] rounded-2xl p-3 space-y-1">
            <p className="text-[10px] font-bold text-[#555861] uppercase tracking-wide">Requisitos</p>
            <ul className="space-y-0.5">
              {['Mínimo 8 caracteres', 'Diferente a la contraseña actual'].map((r) => (
                <li key={r} className="flex items-center gap-1.5 text-[10px] text-[#555861]">
                  <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Contraseña actual */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#2B2D33]">Contraseña Actual *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555861]" />
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 border border-[#D1D5DB] rounded-xl text-xs text-[#2B2D33] focus:outline-none focus:ring-2 focus:ring-[#F2412C]/30 focus:border-[#F2412C] transition"
                placeholder="Tu contraseña actual"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555861] hover:text-[#2B2D33] cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#2B2D33]">Nueva Contraseña *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555861]" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 border border-[#D1D5DB] rounded-xl text-xs text-[#2B2D33] focus:outline-none focus:ring-2 focus:ring-[#F2412C]/30 focus:border-[#F2412C] transition"
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555861] hover:text-[#2B2D33] cursor-pointer"
              >
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {/* Strength bar */}
            {newPassword && (
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1 rounded-full transition-all ${
                      newPassword.length >= i * 3
                        ? i <= 1
                          ? 'bg-red-400'
                          : i <= 2
                            ? 'bg-amber-400'
                            : i <= 3
                              ? 'bg-blue-400'
                              : 'bg-green-500'
                        : 'bg-[#E4E6EA]'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#2B2D33]">Confirmar Contraseña *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555861]" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full pl-9 pr-10 py-2.5 border rounded-xl text-xs text-[#2B2D33] focus:outline-none focus:ring-2 transition ${
                  confirmPassword && confirmPassword !== newPassword
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#D1D5DB] focus:ring-[#F2412C]/30 focus:border-[#F2412C]'
                }`}
                placeholder="Repite la nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555861] hover:text-[#2B2D33] cursor-pointer"
              >
                {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-[10px] text-red-500">Las contraseñas no coinciden</p>
            )}
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#2B2D33] hover:bg-[#1e2024] text-white text-xs font-black rounded-2xl transition cursor-pointer disabled:opacity-60"
          >
            {savingPassword ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            {savingPassword ? 'Actualizando…' : 'Cambiar Contraseña'}
          </button>
        </form>
      )}

      {/* ---- TAB: ACTIVITY ---- */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Cursos inscritos */}
            <div className="bg-white border border-[#D1D5DB] rounded-3xl p-5 shadow-xs flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-2xl font-black text-[#2B2D33]">{profile.stats.enrollments}</span>
              <span className="text-xs text-[#555861] font-medium">Cursos Inscritos</span>
            </div>

            {/* Cursos completados */}
            <div className="bg-white border border-[#D1D5DB] rounded-3xl p-5 shadow-xs flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-2xl font-black text-[#2B2D33]">
                {profile.stats.completedCourses}
              </span>
              <span className="text-xs text-[#555861] font-medium">Cursos Completados</span>
            </div>

            {/* Certificados */}
            <div className="bg-white border border-[#D1D5DB] rounded-3xl p-5 shadow-xs flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-2xl font-black text-[#2B2D33]">{profile.stats.certificates}</span>
              <span className="text-xs text-[#555861] font-medium">Certificados</span>
            </div>
          </div>

          {/* Progreso visual */}
          {profile.stats.enrollments > 0 && (
            <div className="bg-white border border-[#D1D5DB] rounded-3xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-[#2B2D33]">Tasa de Finalización</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-[#E4E6EA] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#F2412C] to-[#ff6b55] rounded-full transition-all"
                    style={{
                      width: `${Math.round((profile.stats.completedCourses / profile.stats.enrollments) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-black text-[#2B2D33] shrink-0">
                  {Math.round((profile.stats.completedCourses / profile.stats.enrollments) * 100)}%
                </span>
              </div>
              <p className="text-[10px] text-[#555861]">
                {profile.stats.completedCourses} de {profile.stats.enrollments} cursos completados
              </p>
            </div>
          )}

          {profile.stats.enrollments === 0 && (
            <div className="bg-[#F8F9FA] border border-[#E4E6EA] rounded-3xl p-8 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-[#D1D5DB] mx-auto" />
              <p className="text-xs font-bold text-[#555861]">Todavía no tienes cursos</p>
              <p className="text-[10px] text-[#555861]">
                Inscríbete en un curso para ver tu actividad aquí
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
