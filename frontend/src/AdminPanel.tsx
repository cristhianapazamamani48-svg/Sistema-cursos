import { useState, useEffect } from 'react';
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

interface Order {
  id: number;
  userId: number;
  courseId: number;
  amount: string;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'expired';
  receiptUrl?: string | null;
  confirmedBy?: number | null;
  confirmedAt?: string | null;
  createdAt: string;
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

interface AdminPanelProps {
  onClose: () => void;
  csrfToken?: string;
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                 */
/* ------------------------------------------------------------------ */

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'orders' | 'videos' | 'students'>('summary');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [students, setStudents] = useState<StudentEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal rechazar video
  const [rejectingVideoId, setRejectingVideoId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Modal aprobar video
  const [approvingVideo, setApprovingVideo] = useState<VideoItem | null>(null);
  const [approvalMinutes, setApprovalMinutes] = useState('10');
  const [approvalSeconds, setApprovalSeconds] = useState('0');

  // Modal comprobante
  const [previewReceipt, setPreviewReceipt] = useState<string | null>(null);

  // Cargar resumen siempre al montar
  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (activeTab !== 'summary') fetchData();
  }, [activeTab]);

  const loadSummary = async () => {
    try {
      const res = await api('/api/admin/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error(err);
    }
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
      } else if (activeTab === 'students') {
        const res = await api('/api/admin/students');
        if (res.ok) setStudents(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
  /* KPI Cards data                                                       */
  /* ------------------------------------------------------------------ */
  const kpiCards = [
    {
      key: 'payments',
      label: 'Pagos Pendientes',
      value: summary?.pendingPaymentsCount ?? '—',
      icon: CreditCard,
      tab: 'orders' as const,
      accent: '#F2412C',
      bg: 'bg-[#F2412C]/10',
      border: 'border-[#F2412C]/20',
      iconColor: 'text-[#F2412C]',
    },
    {
      key: 'videos',
      label: 'Videos por Aprobar',
      value: summary?.pendingVideosCount ?? '—',
      icon: Video,
      tab: 'videos' as const,
      accent: '#2B2D33',
      bg: 'bg-[#2B2D33]/10',
      border: 'border-[#2B2D33]/20',
      iconColor: 'text-[#2B2D33]',
    },
    {
      key: 'students',
      label: 'Estudiantes Inscritos',
      value: summary?.enrolledStudentsCount ?? '—',
      icon: Users,
      tab: 'students' as const,
      accent: '#16a34a',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      iconColor: 'text-emerald-700',
    },
    {
      key: 'revenue',
      label: 'Ingresos del Mes',
      value: summary
        ? `${Number(summary.monthlyRevenueBob).toLocaleString('es-BO', { minimumFractionDigits: 2 })} BOB`
        : '—',
      icon: TrendingUp,
      tab: 'orders' as const,
      accent: '#F2412C',
      bg: 'bg-[#F2412C]/5',
      border: 'border-[#F2412C]/15',
      iconColor: 'text-[#F2412C]',
    },
  ];

  const tabs = [
    { key: 'summary', label: 'Resumen', icon: LayoutDashboard },
    { key: 'orders', label: 'Órdenes y Pagos', icon: CreditCard },
    { key: 'videos', label: 'Aprobación de Videos', icon: Video },
    { key: 'students', label: 'Estudiantes', icon: Users },
  ] as const;

  /* ------------------------------------------------------------------ */
  /* Render                                                               */
  /* ------------------------------------------------------------------ */
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
          {/* Tabs Selector */}
          <div className="bg-[#E4E6EA] p-1 rounded-2xl flex items-center gap-1 flex-wrap">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === key
                    ? 'bg-white text-[#2B2D33] shadow-sm'
                    : 'text-[#636870] hover:text-[#2B2D33]'
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

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-2xl text-xs font-bold text-[#636870] hover:text-[#2B2D33] hover:bg-[#E4E6EA] transition cursor-pointer"
          >
            Volver al Aula
          </button>
        </div>
      </div>

      {/* Alertas */}
      {actionMsg && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
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
                    <div className={`w-11 h-11 rounded-2xl ${card.bg} ${card.border} border flex items-center justify-center`}>
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

          {/* Accesos rápidos */}
          <div className="bg-white rounded-3xl border border-[#D1D5DB] p-6 shadow-sm">
            <h2 className="text-base font-black text-[#2B2D33] mb-4">Accesos Rápidos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setActiveTab('orders')}
                className="flex items-center gap-3 p-4 rounded-2xl bg-[#E4E6EA] hover:bg-[#D1D5DB] text-left transition cursor-pointer"
              >
                <CreditCard className="w-5 h-5 text-[#F2412C] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#2B2D33]">Gestionar Pagos</p>
                  <p className="text-[11px] text-[#636870]">Aprobar órdenes pendientes</p>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('videos')}
                className="flex items-center gap-3 p-4 rounded-2xl bg-[#E4E6EA] hover:bg-[#D1D5DB] text-left transition cursor-pointer"
              >
                <Video className="w-5 h-5 text-[#F2412C] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#2B2D33]">Revisar Videos</p>
                  <p className="text-[11px] text-[#636870]">Aprobar o rechazar videos</p>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className="flex items-center gap-3 p-4 rounded-2xl bg-[#E4E6EA] hover:bg-[#D1D5DB] text-left transition cursor-pointer"
              >
                <Users className="w-5 h-5 text-[#F2412C] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#2B2D33]">Ver Estudiantes</p>
                  <p className="text-[11px] text-[#636870]">Lista de inscripciones activas</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB ÓRDENES Y PAGOS                                           */}
      {/* ============================================================ */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-[2rem] border border-[#D1D5DB] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-[#2B2D33]">Órdenes de Compra Registradas</h2>
              <p className="text-xs font-medium text-[#9EA3AC] mt-0.5">
                Valida transferencias manuales (QR / depósitos) y activa inscripciones
              </p>
            </div>
            <span className="text-xs font-bold bg-[#E4E6EA] text-[#50545C] px-3 py-1 rounded-full">
              {orders.length} órdenes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E4E6EA] text-[#9EA3AC] uppercase tracking-wider font-bold">
                  <th className="pb-3 px-3">ID</th>
                  <th className="pb-3 px-3">Usuario ID</th>
                  <th className="pb-3 px-3">Curso ID</th>
                  <th className="pb-3 px-3">Monto</th>
                  <th className="pb-3 px-3">Estado</th>
                  <th className="pb-3 px-3">Comprobante</th>
                  <th className="pb-3 px-3">Fecha</th>
                  <th className="pb-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E6EA] font-medium text-[#2B2D33]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#9EA3AC]">Cargando...</td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#9EA3AC]">No hay órdenes de compra registradas.</td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#E4E6EA]/40 transition">
                      <td className="py-4 px-3 font-bold text-[#2B2D33]">#{ord.id}</td>
                      <td className="py-4 px-3">Usuario #{ord.userId}</td>
                      <td className="py-4 px-3">Curso #{ord.courseId}</td>
                      <td className="py-4 px-3 font-bold text-[#2B2D33]">{ord.amount} {ord.currency}</td>
                      <td className="py-4 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                          ord.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : ord.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            ord.status === 'paid' ? 'bg-emerald-500' : ord.status === 'pending' ? 'bg-amber-500' : 'bg-rose-500'
                          }`}></span>
                          {ord.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        {ord.receiptUrl ? (
                          <button
                            onClick={() => setPreviewReceipt(ord.receiptUrl!)}
                            className="inline-flex items-center gap-1 text-[#F2412C] hover:underline font-bold cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Recibo
                          </button>
                        ) : (
                          <span className="text-[#9EA3AC] italic">Sin archivo</span>
                        )}
                      </td>
                      <td className="py-4 px-3 text-[#9EA3AC]">{new Date(ord.createdAt).toLocaleDateString()}</td>
                      <td className="py-4 px-3 text-right">
                        {ord.status === 'pending' ? (
                          <button
                            onClick={() => handleConfirmOrder(ord.id)}
                            className="px-3.5 py-1.5 bg-[#F2412C] hover:bg-[#d4321e] text-white rounded-xl font-bold text-xs shadow-sm transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" /> Aprobar Pago
                          </button>
                        ) : (
                          <span className="text-[#9EA3AC] font-semibold text-[11px]">Procesado</span>
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
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#9EA3AC]">Cargando...</td>
                  </tr>
                ) : videos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#9EA3AC]">No hay videos registrados.</td>
                  </tr>
                ) : (
                  videos.map((vid) => (
                    <tr key={vid.id} className="hover:bg-[#E4E6EA]/40 transition">
                      <td className="py-4 px-3 font-bold text-[#2B2D33]">#{vid.id}</td>
                      <td className="py-4 px-3 font-bold text-[#2B2D33]">
                        {vid.title}
                        {vid.rejectionReason && (
                          <p className="text-[11px] font-normal text-rose-600 mt-0.5">Motivo rechazo: {vid.rejectionReason}</p>
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
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                          vid.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : vid.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            vid.status === 'approved' ? 'bg-emerald-500' : vid.status === 'pending' ? 'bg-amber-500' : 'bg-rose-500'
                          }`}></span>
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
      {/* TAB ESTUDIANTES                                               */}
      {/* ============================================================ */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-[2rem] border border-[#D1D5DB] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-[#2B2D33]">Estudiantes Inscritos</h2>
              <p className="text-xs font-medium text-[#9EA3AC] mt-0.5">
                Inscripciones activas y completadas en la plataforma
              </p>
            </div>
            <span className="text-xs font-bold bg-[#E4E6EA] text-[#50545C] px-3 py-1 rounded-full">
              {students.length} inscripciones
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E4E6EA] text-[#9EA3AC] uppercase tracking-wider font-bold">
                  <th className="pb-3 px-3">ID</th>
                  <th className="pb-3 px-3">Estudiante</th>
                  <th className="pb-3 px-3">Email</th>
                  <th className="pb-3 px-3">Curso</th>
                  <th className="pb-3 px-3">Estado</th>
                  <th className="pb-3 px-3">Inscrito el</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E6EA] font-medium text-[#2B2D33]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#9EA3AC]">Cargando...</td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#9EA3AC]">No hay estudiantes inscritos.</td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.enrollmentId} className="hover:bg-[#E4E6EA]/40 transition">
                      <td className="py-4 px-3 font-bold text-[#2B2D33]">#{s.enrollmentId}</td>
                      <td className="py-4 px-3 font-bold text-[#2B2D33]">{s.studentName}</td>
                      <td className="py-4 px-3 text-[#636870]">{s.studentEmail}</td>
                      <td className="py-4 px-3">{s.courseTitle}</td>
                      <td className="py-4 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                          s.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.status === 'active'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            s.status === 'completed' ? 'bg-emerald-500' : s.status === 'active' ? 'bg-blue-500' : 'bg-rose-500'
                          }`}></span>
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-[#9EA3AC]">{new Date(s.enrolledAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL APROBAR VIDEO                                           */}
      {/* ============================================================ */}
      {approvingVideo && (
        <div className="fixed inset-0 bg-[#2B2D33]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
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
        <div className="fixed inset-0 bg-[#2B2D33]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
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

      {/* ============================================================ */}
      {/* MODAL COMPROBANTE                                             */}
      {/* ============================================================ */}
      {previewReceipt && (
        <div className="fixed inset-0 bg-[#2B2D33]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#D1D5DB] p-6 max-w-lg w-full shadow-2xl text-center">
            <h3 className="text-base font-black text-[#2B2D33] mb-2">Comprobante de Pago</h3>
            <div className="p-4 bg-[#E4E6EA] rounded-2xl border border-[#D1D5DB] mb-4">
              <p className="text-xs font-mono text-[#50545C] break-all">{previewReceipt}</p>
            </div>
            <button
              onClick={() => setPreviewReceipt(null)}
              className="px-6 py-2 rounded-xl bg-[#2B2D33] text-white text-xs font-bold cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
