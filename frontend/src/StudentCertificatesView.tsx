import React, { useState, useEffect } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  GraduationCap,
  Loader2,
  QrCode as QrIcon,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { api } from './api';
import type { CertificateData } from './CertificateModal';

interface ClaimableCourse {
  enrollmentId: number;
  courseId: number;
  completedAt: string;
  courseTitle: string;
  courseSlug: string;
  thumbnailUrl?: string | null;
}

interface StudentCertificatesViewProps {
  onOpenCertificateModal: (enrollmentId: number, cert?: CertificateData) => void;
  onOpenVerifyModal: (code: string) => void;
  onNavigateToCourses: () => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export default function StudentCertificatesView({
  onOpenCertificateModal,
  onOpenVerifyModal,
  onNavigateToCourses,
  showToast,
}: StudentCertificatesViewProps) {
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [claimableCourses, setClaimableCourses] = useState<ClaimableCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [claimingEnrollmentId, setClaimingEnrollmentId] = useState<number | null>(null);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    setLoading(true);
    try {
      const res = await api('/api/certificates/my');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCertificates(data);
          setClaimableCourses([]);
        } else {
          setCertificates(data.certificates || []);
          setClaimableCourses(data.claimable || []);
        }
      } else {
        showToast('error', 'No se pudieron cargar tus certificados');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast('info', `Código ${code} copiado al portapapeles`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const handleClaimCertificate = async (enrollmentId: number) => {
    setClaimingEnrollmentId(enrollmentId);
    try {
      const res = await api(`/api/certificates/issue/${enrollmentId}`, {
        method: 'POST',
      });
      if (res.ok) {
        const cert: CertificateData = await res.json();
        showToast('success', '¡Certificado oficial emitido exitosamente!');
        await loadCertificates();
        onOpenCertificateModal(enrollmentId, cert);
      } else {
        const err = await res.json();
        showToast('error', err.message || 'Error al emitir certificado');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error de conexión');
    } finally {
      setClaimingEnrollmentId(null);
    }
  };

  const filteredCerts = certificates.filter(
    (c) =>
      c.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalHours = certificates.reduce((acc, c) => acc + (c.workloadHours || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in text-[#2B2D33]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#D1D5DB] rounded-3xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-white px-2.5 py-0.5 rounded shadow-xs">
              Acreditación Oficial
            </span>
            <span className="text-xs text-[#555861]">Validez Digital Criptográfica</span>
          </div>
          <h1 className="text-2xl font-black text-[#2B2D33] mt-1">Mis Certificados</h1>
          <p className="text-xs text-[#555861]">
            Diplomas obtenidos al completar satisfactoriamente tus cursos y horas académicas
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadCertificates}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#2B2D33] text-xs font-bold border border-[#D1D5DB] transition cursor-pointer"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Métricas del Estudiante */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#D1D5DB] rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-[#555861] font-bold uppercase tracking-wider block">
              Certificados Obtenidos
            </span>
            <span className="text-2xl font-black text-[#2B2D33]">{certificates.length}</span>
          </div>
        </div>

        <div className="bg-white border border-[#D1D5DB] rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-[#555861] font-bold uppercase tracking-wider block">
              Horas Académicas Totales
            </span>
            <span className="text-2xl font-black text-[#2B2D33]">{totalHours} hrs</span>
          </div>
        </div>

        <div className="bg-white border border-[#D1D5DB] rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-[#555861] font-bold uppercase tracking-wider block">
              Pendientes por Reclamar
            </span>
            <span className="text-2xl font-black text-[#2B2D33]">{claimableCourses.length}</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: CURSOS COMPLETADOS LISTOS PARA EMITIR CERTIFICADO */}
      {claimableCourses.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl p-6 shadow-xs space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wider">
              ¡Tienes cursos completados listos para certificar!
            </h3>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Has cumplido con todos los requisitos académicos de los siguientes programas. Haz clic en reclamar para generar tu diploma con firma digital y código único.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {claimableCourses.map((c) => (
              <div
                key={c.enrollmentId}
                className="bg-white border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xs"
              >
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    Curso Aprobado
                  </span>
                  <h4 className="text-sm font-bold text-[#2B2D33] mt-1.5">{c.courseTitle}</h4>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-emerald-100">
                  <span className="text-[11px] text-[#555861]">
                    Finalizado:{' '}
                    {c.completedAt ? new Date(c.completedAt).toLocaleDateString() : 'Completado'}
                  </span>
                  <button
                    onClick={() => handleClaimCertificate(c.enrollmentId)}
                    disabled={claimingEnrollmentId === c.enrollmentId}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-white text-xs font-black shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    {claimingEnrollmentId === c.enrollmentId ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <Award className="w-3.5 h-3.5" />
                        <span>Reclamar Certificado</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECCIÓN 2: DIPLOMAS Y CERTIFICADOS EMITIDOS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-black text-[#2B2D33] flex items-center gap-2">
            <Award className="w-5 h-5 text-[#F2412C]" />
            Diplomas Emitidos ({certificates.length})
          </h3>

          {certificates.length > 0 && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#555861] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por curso o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D1D5DB] text-xs focus:outline-none focus:border-[#F2412C] text-[#2B2D33] bg-white"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white border border-[#D1D5DB] rounded-3xl p-16 text-center text-xs text-[#555861] flex items-center justify-center gap-2 shadow-xs">
            <Loader2 className="w-5 h-5 animate-spin text-[#F2412C]" />
            <span>Cargando certificados...</span>
          </div>
        ) : filteredCerts.length === 0 ? (
          <div className="bg-white border border-[#D1D5DB] rounded-3xl p-14 text-center space-y-4 max-w-lg mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto text-amber-600">
              <Award className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#2B2D33]">Aún no tienes certificados emitidos</h3>
              <p className="text-xs text-[#555861] leading-relaxed max-w-sm mx-auto">
                Al completar el 100% de las lecciones y horas lectivas de tus cursos inscritos, podrás descargar tus diplomas oficiales aquí.
              </p>
            </div>
            <button
              onClick={onNavigateToCourses}
              className="inline-flex items-center gap-2 bg-[#F2412C] hover:bg-[#D93522] text-white text-xs font-bold py-2.5 px-6 rounded-xl transition shadow-md shadow-[#F2412C]/20 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Ir a Mis Cursos</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCerts.map((cert) => (
              <div
                key={cert.id}
                className="bg-white border border-[#D1D5DB] rounded-3xl p-5 shadow-xs space-y-4 hover:border-[#F2412C]/40 transition"
              >
                {/* Cabecera del Certificado */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">
                      Certificado Verificado
                    </span>
                    <h4 className="text-base font-bold text-[#2B2D33] line-clamp-1 mt-1">
                      {cert.courseTitle}
                    </h4>
                    <p className="text-xs text-[#555861]">
                      Otorgado a: <strong className="text-[#2B2D33]">{cert.studentName}</strong>
                    </p>
                  </div>

                  <div className="w-11 h-11 rounded-2xl bg-[#2B2D33] text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                </div>

                {/* Caja de Código de Validación con Botón de Copiar */}
                <div className="bg-[#F8F9FA] border border-[#D1D5DB] rounded-2xl p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#555861] block">
                      Código Único de Validación:
                    </span>
                    <span className="font-mono font-black text-xs text-[#2B2D33] tracking-wide truncate block">
                      {cert.code}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyCode(cert.code)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-[#D1D5DB] text-[11px] font-bold text-[#2B2D33] transition cursor-pointer shrink-0"
                    title="Copiar código de validación"
                  >
                    {copiedCode === cert.code ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#555861]" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Metadatos (Horas y Fecha de Emisión) */}
                <div className="flex items-center justify-between text-xs text-[#555861] pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#F2412C]" />
                    {cert.workloadHours} horas lectivas
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(cert.issuedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Botones de Acción */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E4E6EA]">
                  <button
                    onClick={() => onOpenCertificateModal(cert.enrollmentId, cert)}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#2B2D33] hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ver Diploma</span>
                  </button>

                  <button
                    onClick={() => onOpenVerifyModal(cert.code)}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-[#2B2D33] text-xs font-bold border border-[#D1D5DB] transition cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Validar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
