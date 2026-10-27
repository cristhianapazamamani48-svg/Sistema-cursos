import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Video, 
  ExternalLink, 
  Eye, 
  Check, 
  X,
  RefreshCw,
} from 'lucide-react';
import { api } from './api';

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

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'videos'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal para rechazar video
  const [rejectingVideoId, setRejectingVideoId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Modal para ver comprobante
  const [previewReceipt, setPreviewReceipt] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setActionMsg(null);
    try {
      if (activeTab === 'orders') {
        const res = await api('/api/orders/admin/all');
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } else {
        const res = await api('/api/videos');
        if (res.ok) {
          const data = await res.json();
          setVideos(data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Confirmar pago manual de una orden
  const handleConfirmOrder = async (orderId: number) => {
    try {
      const res = await api(`/api/orders/${orderId}/confirm-manual`, {
        method: 'POST',
        body: JSON.stringify({
          notes: 'Pago validado por administrador desde el panel de control',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al confirmar pago');

      setActionMsg({ type: 'success', text: `¡Orden #${orderId} aprobada e inscripción activada!` });
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  // Aprobar video
  const handleApproveVideo = async (videoId: number) => {
    try {
      const res = await api(`/api/videos/${videoId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'approved',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al aprobar video');

      setActionMsg({ type: 'success', text: `¡Video #${videoId} aprobado exitosamente!` });
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  // Rechazar video con motivo
  const handleRejectVideo = async () => {
    if (!rejectingVideoId || !rejectionReason.trim()) return;

    try {
      const res = await api(`/api/videos/${rejectingVideoId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: rejectionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al rechazar video');

      setActionMsg({ type: 'success', text: `Video #${rejectingVideoId} rechazado.` });
      setRejectingVideoId(null);
      setRejectionReason('');
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Barra Superior del Panel */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl shadow-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-0.5 rounded-full">
              Panel Administrativo
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Gestión de Pagos y Auditoría de Videos</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs Selector estilo pastilla */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Órdenes y Pagos</span>
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'videos'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Video className="w-4 h-4 text-blue-600" />
              <span>Aprobación de Videos</span>
            </button>
          </div>

          <button
            onClick={fetchData}
            title="Refrescar datos"
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
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

      {/* TAB 1: GESTIÓN DE ÓRDENES Y PAGOS */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900">Órdenes de Compra Registradas</h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Valida transferencias manuales (QR / depósitos) y activa inscripciones
              </p>
            </div>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              {orders.length} órdenes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
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
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No hay órdenes de compra registradas.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-3 font-bold text-slate-900">#{ord.id}</td>
                      <td className="py-4 px-3">Usuario #{ord.userId}</td>
                      <td className="py-4 px-3">Curso #{ord.courseId}</td>
                      <td className="py-4 px-3 font-bold text-slate-900">
                        {ord.amount} {ord.currency}
                      </td>
                      <td className="py-4 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                            ord.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ord.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              ord.status === 'paid'
                                ? 'bg-emerald-500'
                                : ord.status === 'pending'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          ></span>
                          {ord.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        {ord.receiptUrl ? (
                          <button
                            onClick={() => setPreviewReceipt(ord.receiptUrl!)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver Recibo
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">Sin archivo</span>
                        )}
                      </td>
                      <td className="py-4 px-3 text-slate-400">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-3 text-right">
                        {ord.status === 'pending' ? (
                          <button
                            onClick={() => handleConfirmOrder(ord.id)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            Aprobar Pago
                          </button>
                        ) : (
                          <span className="text-slate-400 font-semibold text-[11px]">Procesado</span>
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

      {/* TAB 2: APROBACIÓN DE VIDEOS */}
      {activeTab === 'videos' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900">Videos Subidos por Docentes</h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Flujo de aprobación: Solo videos aprobados pueden publicarse en lecciones
              </p>
            </div>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              {videos.length} videos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="pb-3 px-3">ID</th>
                  <th className="pb-3 px-3">Título</th>
                  <th className="pb-3 px-3">Proveedor / Ref</th>
                  <th className="pb-3 px-3">Duración</th>
                  <th className="pb-3 px-3">Docente</th>
                  <th className="pb-3 px-3">Estado</th>
                  <th className="pb-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {videos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No hay videos registrados.
                    </td>
                  </tr>
                ) : (
                  videos.map((vid) => (
                    <tr key={vid.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-3 font-bold text-slate-900">#{vid.id}</td>
                      <td className="py-4 px-3 font-bold text-slate-900">
                        {vid.title}
                        {vid.rejectionReason && (
                          <p className="text-[11px] font-normal text-rose-600 mt-0.5">
                            Motivo rechazo: {vid.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-3">
                        <span className="uppercase text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md mr-1.5">
                          {vid.provider}
                        </span>
                        <a
                          href={`https://youtube.com/watch?v=${vid.providerRef}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                        >
                          {vid.providerRef} <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="py-4 px-3">
                        {Math.floor(vid.durationSeconds / 60)}m {vid.durationSeconds % 60}s
                      </td>
                      <td className="py-4 px-3">Docente #{vid.uploadedBy}</td>
                      <td className="py-4 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                            vid.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : vid.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              vid.status === 'approved'
                                ? 'bg-emerald-500'
                                : vid.status === 'pending'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          ></span>
                          {vid.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right">
                        {vid.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApproveVideo(vid.id)}
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
                          <span className="text-slate-400 font-semibold text-[11px]">Revisado</span>
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

      {/* MODAL PARA RECHAZAR VIDEO (Exige motivo por constraint rejected_needs_reason) */}
      {rejectingVideoId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-100 p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-black text-slate-900">Motivo del Rechazo</h3>
            <p className="text-xs text-slate-500 mt-1">
              Es obligatorio indicar la razón por la cual este video no es apto (audio bajo, contenido incorrecto, etc.)
            </p>

            <textarea
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ej. El audio tiene demasiado ruido o falta la última parte de la lección..."
              className="w-full mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500"
            ></textarea>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => { setRejectingVideoId(null); setRejectionReason(''); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
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

      {/* MODAL PREVISUALIZAR COMPROBANTE */}
      {previewReceipt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 max-w-lg w-full shadow-2xl text-center">
            <h3 className="text-base font-black text-slate-900 mb-2">Comprobante de Pago</h3>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
              <p className="text-xs font-mono text-slate-600 break-all">{previewReceipt}</p>
            </div>
            <button
              onClick={() => setPreviewReceipt(null)}
              className="px-6 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
