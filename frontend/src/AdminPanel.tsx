import { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Video,
  ExternalLink,
  Eye,
  Check,
  X,
  RefreshCw,
  LayoutDashboard,
  Users,
  TrendingUp,
  ArrowRight,
  Filter,
  AlertCircle,
  User,
  BookOpen,
  FileText,
} from 'lucide-react';
import { api } from './api';

/* ------------------------------------------------------------------ */
/* Interfaces                                                           */
/* ------------------------------------------------------------------ */

interface AdminSummary {
  pendingPaymentsCount: number;
  pendingVideosCount: number;
  enrolledStudentsCount: number;
  monthlyRevenueBob: number;
}

interface StudentEnrollment {
  enrollmentId: number;
  enrolledAt: string;
  status: string;
  studentId: number;
  studentName: string;
  studentEmail: string;
  courseId: number;
  courseTitle: string;
  courseSlug: string;
}

/** snake_case porque viene directo del SQL JOIN en el backend */
interface Order {
  id: number;
  user_id: number;
  course_id: number;
  amount: string;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'expired';
  receipt_url?: string | null;
  confirmed_by?: number | null;
  confirmed_at?: string | null;
  created_at: string;
  student_name?: string | null;
  student_email?: string | null;
  course_title?: string | null;
  course_slug?: string | null;
}

interface VideoItem {
  id: number;
  title: string;
  provider: 'youtube' | 'cloudflare' | 'vimeo';
  providerRef: string;
  durationSeconds: number;
  uploadedBy: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  reviewedBy?: number | null;
  reviewedAt?: string | null;
  createdAt: string;
}

interface PlatformUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface PlatformCourse {
  id: number;
  title: string;
  slug: string;
  category: string;
  price: string;
  currency: string;
  status: string;
  minWatchPercentage: number;
  createdAt: string;
}

interface AdminPanelProps {
  onClose?: () => void;
  csrfToken?: string;
  initialTab?: 'summary' | 'orders' | 'videos' | 'users' | 'courses';
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                 */
/* ------------------------------------------------------------------ */

export default function AdminPanel({ onClose, initialTab }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'orders' | 'videos' | 'users' | 'courses'>(
    initialTab || 'summary'
  );
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [coursesList, setCoursesList] = useState<PlatformCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Filtro de órdenes
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');

  // Modal detalle de orden
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Modal rechazar video
  const [rejectingVideoId, setRejectingVideoId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Modal aprobar video
  const [approvingVideo, setApprovingVideo] = useState<VideoItem | null>(null);
  const [approvalMinutes, setApprovalMinutes] = useState('10');
  const [approvalSeconds, setApprovalSeconds] = useState('0');

  // Órdenes filtradas
  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders;
    return orders.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  const orderCounts = useMemo(() => ({
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    paid: orders.filter((o) => o.status === 'paid').length,
    failed: orders.filter((o) => o.status === 'failed').length,
  }), [orders]);

  /* ---- Carga de datos --------------------------------------------- */
  useEffect(() => { loadSummary(); }, []);

  useEffect(() => {
    if (activeTab !== 'summary') fetchData();
  }, [activeTab]);

  const loadSummary = async () => {
    try {
      const res = await api('/api/admin/summary');
      if (res.ok) setSummary(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchData = async () => {
    setLoading(true);
    setActionMsg(null);
    try {
      if (activeTab === 'orders') {
        const res = await api('/api/orders/admin/all');
        if (res.ok) setOrders(await res.json());
      } else if (activeTab === 'videos') {
        const res = await api('/api/videos');
        if (res.ok) setVideos(await res.json());
      } else if (activeTab === 'users') {
        const res = await api('/api/admin/users');
        if (res.ok) setUsers(await res.json());
      } else if (activeTab === 'courses') {
        const res = await api('/api/courses/admin/all');
        if (res.ok) setCoursesList(await res.json());
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleRefresh = () => {
    if (activeTab === 'summary') loadSummary();
    else fetchData();
  };

  /* ---- Acciones órdenes ------------------------------------------- */
  const handleConfirmOrder = async (orderId: number) => {
    try {
      const res = await api(`/api/orders/${orderId}/confirm-manual`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Pago validado por administrador desde el panel de control' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al confirmar pago');
      setActionMsg({ type: 'success', text: `¡Orden #${orderId} aprobada e inscripción activada!` });
      setSelectedOrder(null);
      fetchData();
      loadSummary();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  const handleRejectOrder = async () => {
    if (!selectedOrder || rejectReason.trim().length < 5) return;
    try {
      const res = await api(`/api/orders/${selectedOrder.id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al rechazar la orden');
      setActionMsg({ type: 'success', text: `Orden #${selectedOrder.id} rechazada correctamente.` });
      setSelectedOrder(null);
      setRejectReason('');
      setShowRejectForm(false);
      fetchData();
      loadSummary();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  /* ---- Acciones videos -------------------------------------------- */
  const handleStartApproveVideo = (video: VideoItem) => {
    setApprovingVideo(video);
    const defaultMins = Math.max(1, Math.floor((video.durationSeconds || 600) / 60));
    const defaultSecs = (video.durationSeconds || 0) % 60;
    setApprovalMinutes(defaultMins.toString());
    setApprovalSeconds(defaultSecs.toString());
  };

  const handleConfirmApproveVideo = async () => {
    if (!approvingVideo) return;
    const mins = parseInt(approvalMinutes) || 0;
    const secs = parseInt(approvalSeconds) || 0;
    const totalDuration = mins * 60 + secs;
    if (totalDuration <= 0) {
      setActionMsg({ type: 'error', text: 'La duración del video debe ser mayor a 0 segundos' });
      return;
    }
    try {
      const res = await api(`/api/videos/${approvingVideo.id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved', durationSeconds: totalDuration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al aprobar video');
      setActionMsg({ type: 'success', text: `¡Video #${approvingVideo.id} aprobado con duración ${mins}m ${secs}s!` });
      setApprovingVideo(null);
      fetchData();
      loadSummary();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  const handleRejectVideo = async () => {
    if (!rejectingVideoId || !rejectionReason.trim()) return;
    try {
      const res = await api(`/api/videos/${rejectingVideoId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected', rejectionReason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al rechazar video');
      setActionMsg({ type: 'success', text: `Video #${rejectingVideoId} rechazado.` });
      setRejectingVideoId(null);
      setRejectionReason('');
      fetchData();
      loadSummary();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  /* ------------------------------------------------------------------ */
  /* KPI Cards                                                            */
  /* ------------------------------------------------------------------ */
  const kpiCards = [
    {
      key: 'payments', label: 'Pagos Pendientes',
      value: summary?.pendingPaymentsCount ?? '—', icon: CreditCard,
      tab: 'orders' as const, bg: 'bg-[#F2412C]/10', border: 'border-[#F2412C]/20', iconColor: 'text-[#F2412C]',
    },
    {
      key: 'videos', label: 'Videos por Aprobar',
      value: summary?.pendingVideosCount ?? '—', icon: Video,
      tab: 'videos' as const, bg: 'bg-[#2B2D33]/10', border: 'border-[#2B2D33]/20', iconColor: 'text-[#2B2D33]',
    },
    {
      key: 'students', label: 'Usuarios del Sistema',
      value: summary?.enrolledStudentsCount ?? '—', icon: Users,
      tab: 'users' as const, bg: 'bg-emerald-50', border: 'border-emerald-200', iconColor: 'text-emerald-700',
    },
    {
      key: 'revenue', label: 'Ingresos del Mes',
      value: summary ? `${Number(summary.monthlyRevenueBob).toLocaleString('es-BO', { minimumFractionDigits: 2 })} BOB` : '—',
      icon: TrendingUp, tab: 'orders' as const,
      bg: 'bg-[#F2412C]/5', border: 'border-[#F2412C]/15', iconColor: 'text-[#F2412C]',
    },
  ];

  const tabs = [
    { key: 'summary', label: 'Resumen', icon: LayoutDashboard },
    { key: 'orders', label: 'Pagos', icon: CreditCard },
    { key: 'videos', label: 'Videos', icon: Video },
    { key: 'users', label: 'Usuarios', icon: Users },
    { key: 'courses', label: 'Cursos', icon: BookOpen },
  ] as const;

  /* ------------------------------------------------------------------ */
  /* Helpers de UI                                                        */
  /* ------------------------------------------------------------------ */
  const statusLabel = (s: Order['status']) =>
    s === 'pending' ? 'Pendiente' : s === 'paid' ? 'Pagado' : s === 'failed' ? 'Rechazado' : s.toUpperCase();

  const statusClasses = (s: Order['status']) =>
    s === 'paid'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : s === 'pending'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';

  const dotClasses = (s: Order['status']) =>
    s === 'paid' ? 'bg-emerald-500' : s === 'pending' ? 'bg-amber-500' : 'bg-rose-500';

  /* ================================================================== */
  /* RENDER                                                               */
  /* ================================================================== */
  return (
    <div className="space-y-6">

      {/* Barra Superior */}
      <div className="bg-white rounded-3xl border border-[#D1D5DB] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider bg-[#F2412C]/10 text-[#F2412C] border border-[#F2412C]/20 px-2.5 py-0.5 rounded-full">
            Panel Administrativo
          </span>
          <h1 className="text-2xl font-black text-[#2B2D33] mt-1">EducaSuite 360 — Admin</h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-[#E4E6EA] p-1 rounded-2xl flex items-center gap-1 flex-wrap">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === key ? 'bg-white text-[#2B2D33] shadow-sm' : 'text-[#636870] hover:text-[#2B2D33]'
                }`}
              >
                <Icon className={`w-4 h-4 ${activeTab === key ? 'text-[#F2412C]' : ''}`} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            title="Refrescar datos"
            className="p-2.5 bg-[#E4E6EA] hover:bg-[#D1D5DB] border border-[#D1D5DB] text-[#50545C] rounded-2xl transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-2xl text-xs font-bold text-[#636870] hover:text-[#2B2D33] hover:bg-[#E4E6EA] transition cursor-pointer"
            >
              Volver al Aula
            </button>
          )}
        </div>
      </div>

      {/* Alertas */}
      {actionMsg && (
        <div className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between ${
          actionMsg.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-xs font-bold underline ml-4 cursor-pointer">
            Cerrar
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB RESUMEN                                                   */}
      {/* ============================================================ */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.key}
                  onClick={() => setActiveTab(card.tab)}
                  className={`group text-left p-6 bg-white rounded-3xl border ${card.border} shadow-sm hover:shadow-md transition-all cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-2xl ${card.bg} border ${card.border} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#9EA3AC] group-hover:text-[#F2412C] transition-colors" />
                  </div>
                  <p className="text-3xl font-black text-[#2B2D33] leading-none mb-2">{card.value}</p>
                  <p className="text-xs font-semibold text-[#636870]">{card.label}</p>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-3xl border border-[#D1D5DB] p-6 shadow-sm">
            <h2 className="text-base font-black text-[#2B2D33] mb-4">Accesos Rápidos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { tab: 'orders' as const, icon: CreditCard, title: 'Gestionar Pagos', desc: 'Aprobar o rechazar órdenes' },
                { tab: 'videos' as const, icon: Video, title: 'Revisar Videos', desc: 'Aprobar o rechazar videos' },
                { tab: 'users' as const, icon: Users, title: 'Gestionar Usuarios', desc: 'Usuarios registrados en el sistema' },
                { tab: 'courses' as const, icon: BookOpen, title: 'Gestionar Cursos', desc: 'Cursos creados en la plataforma' },
              ].map(({ tab, icon: Icon, title, desc }) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-[#E4E6EA] hover:bg-[#D1D5DB] text-left transition cursor-pointer"
                >
                  <Icon className="w-5 h-5 text-[#F2412C] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#2B2D33]">{title}</p>
                    <p className="text-[11px] text-[#636870]">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB ÓRDENES Y PAGOS                                           */}
      {/* ============================================================ */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-[2rem] border border-[#D1D5DB] p-6 shadow-sm">

          {/* Encabezado + filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-black text-[#2B2D33]">Cola de Pagos</h2>
              <p className="text-xs font-medium text-[#9EA3AC] mt-0.5">
                Haz clic en una fila para ver el detalle, comprobante y gestionar la orden
              </p>
            </div>
            <div className="flex items-center gap-1 bg-[#E4E6EA] p-1 rounded-2xl flex-wrap">
              {(
                [
                  { key: 'all', label: 'Todos' },
                  { key: 'pending', label: 'Pendiente' },
                  { key: 'paid', label: 'Pagado' },
                  { key: 'failed', label: 'Rechazado' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setOrderFilter(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    orderFilter === key ? 'bg-white text-[#2B2D33] shadow-sm' : 'text-[#636870] hover:text-[#2B2D33]'
                  }`}
                >
                  {label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    orderFilter === key ? 'bg-[#F2412C] text-white' : 'bg-[#D1D5DB] text-[#636870]'
                  }`}>
                    {orderCounts[key]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E4E6EA] text-[#9EA3AC] uppercase tracking-wider font-bold">
                  <th className="pb-3 px-3">ID</th>
                  <th className="pb-3 px-3">Estudiante</th>
                  <th className="pb-3 px-3">Curso</th>
                  <th className="pb-3 px-3">Monto</th>
                  <th className="pb-3 px-3">Estado</th>
                  <th className="pb-3 px-3">Fecha</th>
                  <th className="pb-3 px-3 text-center">
                    <Filter className="w-3.5 h-3.5 inline" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E6EA] font-medium text-[#2B2D33]">
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-[#9EA3AC]">Cargando...</td></tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#9EA3AC]">
                      No hay órdenes {orderFilter !== 'all' ? `con estado "${orderFilter}"` : 'registradas'}.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr
                      key={ord.id}
                      onClick={() => { setSelectedOrder(ord); setShowRejectForm(false); setRejectReason(''); }}
                      className="hover:bg-[#E4E6EA]/40 transition cursor-pointer group"
                    >
                      <td className="py-4 px-3 font-bold text-[#2B2D33]">#{ord.id}</td>
                      <td className="py-4 px-3">
                        <p className="font-bold text-[#2B2D33]">{ord.student_name ?? `Usuario #${ord.user_id}`}</p>
                        {ord.student_email && (
                          <p className="text-[11px] text-[#9EA3AC]">{ord.student_email}</p>
                        )}
                      </td>
                      <td className="py-4 px-3">{ord.course_title ?? `Curso #${ord.course_id}`}</td>
                      <td className="py-4 px-3 font-bold text-[#2B2D33]">{ord.amount} {ord.currency}</td>
                      <td className="py-4 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] border ${statusClasses(ord.status)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotClasses(ord.status)}`} />
                          {statusLabel(ord.status)}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-[#9EA3AC]">
                        {new Date(ord.created_at).toLocaleDateString('es-BO')}
                      </td>
                      <td className="py-4 px-3 text-center">
                        <Eye className="w-4 h-4 text-[#9EA3AC] group-hover:text-[#F2412C] transition-colors" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB VIDEOS                                                    */}
      {/* ============================================================ */}
      {activeTab === 'videos' && (
        <div className="bg-white rounded-[2rem] border border-[#D1D5DB] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-[#2B2D33]">Videos Subidos por Docentes</h2>
              <p className="text-xs font-medium text-[#9EA3AC] mt-0.5">
                Flujo de aprobación: solo videos aprobados pueden publicarse en lecciones
              </p>
            </div>
            <span className="text-xs font-bold bg-[#E4E6EA] text-[#50545C] px-3 py-1 rounded-full">
              {videos.length} videos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E4E6EA] text-[#9EA3AC] uppercase tracking-wider font-bold">
                  <th className="pb-3 px-3">ID</th>
                  <th className="pb-3 px-3">Título</th>
                  <th className="pb-3 px-3">Proveedor / Ref</th>
                  <th className="pb-3 px-3">Duración</th>
                  <th className="pb-3 px-3">Docente</th>
                  <th className="pb-3 px-3">Estado</th>
                  <th className="pb-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E6EA] font-medium text-[#2B2D33]">
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-[#9EA3AC]">Cargando...</td></tr>
                ) : videos.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-[#9EA3AC]">No hay videos registrados.</td></tr>
                ) : (
                  videos.map((vid) => (
                    <tr key={vid.id} className="hover:bg-[#E4E6EA]/40 transition">
                      <td className="py-4 px-3 font-bold text-[#2B2D33]">#{vid.id}</td>
                      <td className="py-4 px-3 font-bold text-[#2B2D33]">
                        {vid.title}
                        {vid.rejectionReason && (
                          <p className="text-[11px] font-normal text-rose-600 mt-0.5">Motivo: {vid.rejectionReason}</p>
                        )}
                      </td>
                      <td className="py-4 px-3">
                        <span className="uppercase text-[10px] font-bold bg-[#E4E6EA] text-[#50545C] px-2 py-0.5 rounded-md mr-1.5">
                          {vid.provider}
                        </span>
                        <a
                          href={`https://youtube.com/watch?v=${vid.providerRef}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#F2412C] hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                        >
                          {vid.providerRef} <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="py-4 px-3">{Math.floor(vid.durationSeconds / 60)}m {vid.durationSeconds % 60}s</td>
                      <td className="py-4 px-3">Docente #{vid.uploadedBy}</td>
                      <td className="py-4 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] border ${
                          vid.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : vid.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            vid.status === 'approved' ? 'bg-emerald-500'
                            : vid.status === 'pending' ? 'bg-amber-500'
                            : 'bg-rose-500'
                          }`} />
                          {vid.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right">
                        {vid.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleStartApproveVideo(vid)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Aprobar
                            </button>
                            <button
                              onClick={() => setRejectingVideoId(vid.id)}
                              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Rechazar
                            </button>
                          </div>
                        ) : (
                          <span className="text-[#9EA3AC] font-semibold text-[11px]">Revisado</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB USUARIOS                                                  */}
      {/* ============================================================ */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-[2rem] border border-[#D1D5DB] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-[#2B2D33]">Usuarios Registrados</h2>
              <p className="text-xs font-medium text-[#9EA3AC] mt-0.5">
                Cuentas de estudiantes, docentes y administradores de EducaSuite 360
              </p>
            </div>
            <span className="text-xs font-bold bg-[#E4E6EA] text-[#50545C] px-3 py-1 rounded-full">
              {users.length} usuarios
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E4E6EA] text-[#9EA3AC] uppercase tracking-wider font-bold">
                  <th className="pb-3 px-3">ID</th>
                  <th className="pb-3 px-3">Usuario</th>
                  <th className="pb-3 px-3">Email</th>
                  <th className="pb-3 px-3">Rol</th>
                  <th className="pb-3 px-3">Estado</th>
                  <th className="pb-3 px-3">Registrado el</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E6EA] font-medium text-[#2B2D33]">
                {loading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-[#9EA3AC]">Cargando...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-[#9EA3AC]">No hay usuarios registrados.</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#E4E6EA]/40 transition">
                      <td className="py-4 px-3 font-bold text-[#2B2D33]">#{u.id}</td>
                      <td className="py-4 px-3 font-bold text-[#2B2D33]">{u.fullName}</td>
                      <td className="py-4 px-3 text-[#636870]">{u.email}</td>
                      <td className="py-4 px-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                          u.role === 'admin' || u.role === 'superadmin'
                            ? 'bg-[#F2412C]/10 text-[#F2412C] border-[#F2412C]/20'
                            : u.role === 'docente' || u.role === 'teacher'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] border ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-[#9EA3AC]">{new Date(u.createdAt).toLocaleDateString('es-BO')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB CURSOS                                                    */}
      {/* ============================================================ */}
      {activeTab === 'courses' && (
        <div className="bg-white rounded-[2rem] border border-[#D1D5DB] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-[#2B2D33]">Cursos del Sistema</h2>
              <p className="text-xs font-medium text-[#9EA3AC] mt-0.5">
                Todos los cursos registrados en la plataforma EducaSuite 360
              </p>
            </div>
            <span className="text-xs font-bold bg-[#E4E6EA] text-[#50545C] px-3 py-1 rounded-full">
              {coursesList.length} cursos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E4E6EA] text-[#9EA3AC] uppercase tracking-wider font-bold">
                  <th className="pb-3 px-3">ID</th>
                  <th className="pb-3 px-3">Título</th>
                  <th className="pb-3 px-3">Categoría</th>
                  <th className="pb-3 px-3">Precio</th>
                  <th className="pb-3 px-3">Min Asistencia</th>
                  <th className="pb-3 px-3">Estado</th>
                  <th className="pb-3 px-3">Creado el</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E6EA] font-medium text-[#2B2D33]">
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-[#9EA3AC]">Cargando...</td></tr>
                ) : coursesList.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-[#9EA3AC]">No hay cursos registrados.</td></tr>
                ) : (
                  coursesList.map((c) => (
                    <tr key={c.id} className="hover:bg-[#E4E6EA]/40 transition">
                      <td className="py-4 px-3 font-bold text-[#2B2D33]">#{c.id}</td>
                      <td className="py-4 px-3 font-bold text-[#2B2D33]">{c.title}</td>
                      <td className="py-4 px-3 text-[#636870]">{c.category || 'General'}</td>
                      <td className="py-4 px-3 font-bold text-[#2B2D33]">
                        {Number(c.price) === 0 ? (
                          <span className="text-emerald-600 font-bold">Gratis</span>
                        ) : (
                          `${c.price} ${c.currency}`
                        )}
                      </td>
                      <td className="py-4 px-3">{c.minWatchPercentage ?? 80}%</td>
                      <td className="py-4 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] border ${
                          c.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : c.status === 'draft'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            c.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`} />
                          {c.status === 'published' ? 'Publicado' : 'Borrador'}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-[#9EA3AC]">{new Date(c.createdAt).toLocaleDateString('es-BO')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL DETALLE DE ORDEN                                        */}
      {/* ============================================================ */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-[#2B2D33]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#D1D5DB] p-6 max-w-lg w-full shadow-2xl space-y-5">

            {/* Cabecera modal */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[#2B2D33]">Orden #{selectedOrder.id}</h3>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] border mt-1 ${statusClasses(selectedOrder.status)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dotClasses(selectedOrder.status)}`} />
                  {statusLabel(selectedOrder.status)}
                </span>
              </div>
              <button
                onClick={() => { setSelectedOrder(null); setShowRejectForm(false); setRejectReason(''); }}
                className="p-2 rounded-xl hover:bg-[#E4E6EA] transition cursor-pointer text-[#636870]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Datos estudiante y curso */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-[#E4E6EA] rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-[#F2412C]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#636870]">Estudiante</span>
                </div>
                <p className="text-sm font-bold text-[#2B2D33]">{selectedOrder.student_name ?? `ID #${selectedOrder.user_id}`}</p>
                {selectedOrder.student_email && (
                  <p className="text-[11px] text-[#636870] mt-0.5">{selectedOrder.student_email}</p>
                )}
              </div>
              <div className="p-4 bg-[#E4E6EA] rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-[#F2412C]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#636870]">Curso</span>
                </div>
                <p className="text-sm font-bold text-[#2B2D33]">{selectedOrder.course_title ?? `ID #${selectedOrder.course_id}`}</p>
              </div>
            </div>

            {/* Monto y fecha */}
            <div className="flex items-center gap-4 p-4 bg-[#E4E6EA] rounded-2xl">
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#636870] mb-1">Monto</p>
                <p className="text-2xl font-black text-[#2B2D33]">{selectedOrder.amount} {selectedOrder.currency}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#636870] mb-1">Fecha</p>
                <p className="text-sm font-semibold text-[#2B2D33]">
                  {new Date(selectedOrder.created_at).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Comprobante */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-[#636870]" />
                <span className="text-xs font-bold text-[#636870] uppercase tracking-wider">Comprobante</span>
              </div>
              {selectedOrder.receipt_url ? (
                <div className="p-3 bg-[#E4E6EA] rounded-xl border border-[#D1D5DB]">
                  <p className="text-xs font-mono text-[#50545C] break-all mb-2">{selectedOrder.receipt_url}</p>
                  <a
                    href={selectedOrder.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F2412C] hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir comprobante
                  </a>
                </div>
              ) : (
                <div className="p-3 bg-[#E4E6EA] rounded-xl border border-[#D1D5DB] flex items-center gap-2 text-[#9EA3AC]">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">Sin comprobante adjunto</span>
                </div>
              )}
            </div>

            {/* Acciones (solo si está pendiente) */}
            {selectedOrder.status === 'pending' && !showRejectForm && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleConfirmOrder(selectedOrder.id)}
                  className="flex-1 py-2.5 bg-[#F2412C] hover:bg-[#d4321e] text-white rounded-2xl font-bold text-sm transition inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" /> Aprobar Pago
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl font-bold text-sm transition inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <X className="w-4 h-4" /> Rechazar Orden
                </button>
              </div>
            )}

            {/* Formulario de rechazo */}
            {selectedOrder.status === 'pending' && showRejectForm && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-[#2B2D33] block mb-1.5">
                    Motivo del rechazo <span className="text-[#F2412C]">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ej. El comprobante no corresponde al monto, imagen ilegible..."
                    className="w-full p-3 rounded-2xl bg-[#E4E6EA] border border-[#D1D5DB] text-xs font-medium focus:outline-none focus:border-[#F2412C] resize-none"
                  />
                  {rejectReason.trim().length > 0 && rejectReason.trim().length < 5 && (
                    <p className="text-[11px] text-[#F2412C] mt-1">Mínimo 5 caracteres</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                    className="flex-1 py-2 rounded-2xl text-xs font-bold text-[#636870] hover:bg-[#E4E6EA] transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRejectOrder}
                    disabled={rejectReason.trim().length < 5}
                    className="flex-1 py-2 rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 cursor-pointer transition"
                  >
                    Confirmar Rechazo
                  </button>
                </div>
              </div>
            )}

            {/* Si no es pendiente */}
            {selectedOrder.status !== 'pending' && (
              <p className="text-center text-xs text-[#9EA3AC] italic pt-2">
                Esta orden ya fue procesada y no puede modificarse.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL APROBAR VIDEO                                           */}
      {/* ============================================================ */}
      {approvingVideo && (
        <div className="fixed inset-0 bg-[#2B2D33]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#2B2D33] rounded-3xl border border-[#40444B] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Aprobar Video #{approvingVideo.id}</h3>
                <p className="text-xs text-[#9EA3AC]">Define la duración académica requerida</p>
              </div>
            </div>

            <div className="p-3 bg-[#1A1C20] rounded-xl border border-[#363940]">
              <p className="text-xs font-bold text-white truncate">{approvingVideo.title}</p>
              <p className="text-[11px] font-mono text-[#9EA3AC] mt-0.5">ID: {approvingVideo.providerRef}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#E4E6EA] block">Duración del video *</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-[#9EA3AC] block mb-1">Minutos:</span>
                  <input
                    type="number" min="0" value={approvalMinutes}
                    onChange={(e) => setApprovalMinutes(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1A1C20] border border-[#40444B] text-xs font-bold text-white focus:outline-none focus:border-[#F2412C]"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#9EA3AC] block mb-1">Segundos:</span>
                  <input
                    type="number" min="0" max="59" value={approvalSeconds}
                    onChange={(e) => setApprovalSeconds(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1A1C20] border border-[#40444B] text-xs font-bold text-white focus:outline-none focus:border-[#F2412C]"
                  />
                </div>
              </div>
              <p className="text-[11px] text-[#9EA3AC]">
                Total: <b className="text-white">{(parseInt(approvalMinutes) || 0) * 60 + (parseInt(approvalSeconds) || 0)}</b> segundos
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setApprovingVideo(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#9EA3AC] hover:bg-[#363940] transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmApproveVideo}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
              >
                Confirmar Aprobación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL RECHAZAR VIDEO                                          */}
      {/* ============================================================ */}
      {rejectingVideoId && (
        <div className="fixed inset-0 bg-[#2B2D33]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#D1D5DB] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-black text-[#2B2D33]">Motivo del Rechazo</h3>
            <p className="text-xs text-[#636870] mt-1">
              Es obligatorio indicar la razón por la cual este video no es apto
            </p>
            <textarea
              rows={3} required value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ej. El audio tiene demasiado ruido..."
              className="w-full mt-4 p-3 rounded-2xl bg-[#E4E6EA] border border-[#D1D5DB] text-xs font-medium focus:outline-none focus:border-[#F2412C]"
            />
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => { setRejectingVideoId(null); setRejectionReason(''); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#636870] hover:bg-[#E4E6EA] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleRejectVideo}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 cursor-pointer"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
