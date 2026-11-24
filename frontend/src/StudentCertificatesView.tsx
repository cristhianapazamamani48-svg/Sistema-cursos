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
  Printer,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { api } from './api';
import type { CertificateData } from './CertificateModal';

// ── Certificado Demo del Estudiante (siempre visible) ──────────────────────
const DEMO_CERT = {
  studentName: 'María Elena Condori Mamani',
  courseTitle: 'Estrategia Empresarial y Ventaja Competitiva',
  workloadHours: 40,
  code: 'EDU-STRAT-2026-001',
  issuedAt: '2026-10-15T00:00:00Z',
};

function DemoCertificateBanner({
  onOpenDemo,
}: {
  onOpenDemo: () => void;
}) {
  const [copiedDemo, setCopiedDemo] = useState(false);
  const demoVerifyUrl = `${window.location.origin}?verify=${encodeURIComponent(DEMO_CERT.code)}`;
  const demoQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=96x96&color=1a1c20&bgcolor=ffffff&data=${encodeURIComponent(demoVerifyUrl)}&ecc=M`;
  const formattedDate = new Date(DEMO_CERT.issuedAt).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(demoVerifyUrl);
    setCopiedDemo(true);
    setTimeout(() => setCopiedDemo(false), 2500);
  };

  return (
    <div className="bg-gradient-to-br from-[#1a1c20] to-[#2b2d33] border border-[#363940] rounded-3xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#363940]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shrink-0">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Certificado de Ejemplo</h3>
            <p className="text-[11px] text-[#9EA3AC]">Así lucirá tu diploma oficial al completar un curso</p>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-900/40 border border-amber-700/40 px-2.5 py-1 rounded-full">
          Demo
        </span>
      </div>

      {/* Miniatura del Certificado */}
      <div className="p-5 sm:p-6">
        {/* Vista previa escalada */}
        <div
          className="relative bg-white rounded-2xl overflow-hidden shadow-2xl mx-auto"
          style={{ maxWidth: 680 }}
        >
          {/* Franja lateral izquierda */}
          <div
            className="absolute left-0 top-0 bottom-0 flex flex-col items-center justify-center"
            style={{ width: 36, background: '#1a1c20' }}
          />
          {/* Marco rojo interior */}
          <div
            className="absolute"
            style={{ top: 10, left: 44, right: 10, bottom: 10, border: '1px solid rgba(242,65,44,0.3)', pointerEvents: 'none' }}
          />

          <div className="relative" style={{ paddingLeft: 52, paddingRight: 20, paddingTop: 20, paddingBottom: 18 }}>
            {/* Cabecera */}
            <div className="flex items-start justify-between" style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 12, marginBottom: 16 }}>
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 38, height: 38, borderRadius: 10, background: '#1a1c20', border: '1.5px solid #F2412C' }}
                >
                  <span className="font-black text-white" style={{ fontSize: 11 }}>E<span style={{ color: '#F2412C' }}>360</span></span>
                </div>
                <div>
                  <p className="font-black uppercase" style={{ fontSize: 11, color: '#1a1c20', letterSpacing: '0.03em' }}>EducaSuite 360</p>
                  <p className="font-bold uppercase" style={{ fontSize: 7, color: '#9ca3af', letterSpacing: '0.1em' }}>Centro de Especialización y Formación Continua</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end" style={{ gap: 2 }}>
                  <span style={{ fontSize: 7, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Código</span>
                  <span className="font-mono font-black" style={{ fontSize: 8, color: '#1a1c20', background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '1px 6px', borderRadius: 4 }}>
                    {DEMO_CERT.code}
                  </span>
                </div>
                <div style={{ width: 48, height: 48, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={demoQrUrl} alt="QR demo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>
            </div>

            {/* Cuerpo */}
            <div className="text-center" style={{ marginBottom: 16 }}>
              <div className="inline-flex items-center gap-1.5" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 999, padding: '3px 12px', marginBottom: 10 }}>
                <CheckCircle2 style={{ width: 11, height: 11, color: '#16a34a', flexShrink: 0 }} />
                <span style={{ fontSize: 7.5, fontWeight: 900, color: '#14532d', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Certificado de Aprobación y Finalización</span>
              </div>
              <p style={{ fontSize: 8, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Georgia, serif' }}>
                Por cuanto se acredita formalmente que:
              </p>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1a1c20', fontFamily: 'Georgia, serif', lineHeight: 1.1, marginBottom: 6 }}>
                {DEMO_CERT.studentName}
              </h2>
              <div style={{ width: 140, height: 1.5, background: 'linear-gradient(to right, transparent, #F2412C, transparent)', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 8, color: '#6b7280', maxWidth: 400, margin: '0 auto 8px', lineHeight: 1.5 }}>
                Ha completado y aprobado satisfactoriamente todos los módulos académicos del programa:
              </p>
              <h3 style={{ fontSize: 15, fontWeight: 900, color: '#1a1c20', marginBottom: 10 }}>
                «{DEMO_CERT.courseTitle}»
              </h3>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {[
                  { label: 'Horas', value: `${DEMO_CERT.workloadHours} horas` },
                  { label: 'Modalidad', value: 'Virtual Asistida' },
                  { label: 'Emisión', value: formattedDate },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 6, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</span>
                    <span style={{ fontSize: 8, color: '#1a1c20', fontWeight: 800 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pie */}
            <div className="grid" style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'end' }}>
              <div className="text-center">
                <div style={{ height: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 3 }}>
                  <div style={{ width: 110, borderBottom: '1px solid #1a1c20', paddingBottom: 3 }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 10, color: '#374151', opacity: 0.7 }}>Consejo Académico</span>
                  </div>
                </div>
                <p style={{ fontSize: 8, fontWeight: 800, color: '#1a1c20', marginTop: 2 }}>Consejo Académico</p>
                <p style={{ fontSize: 7, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 1 }}>Autoridad Académica</p>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid #1a1c20', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1px dashed #F2412C', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 5.5, fontWeight: 900, color: '#1a1c20', textTransform: 'uppercase' }}>SELLO</span>
                  <span style={{ fontSize: 10, color: '#F2412C', lineHeight: 1 }}>★</span>
                  <span style={{ fontSize: 5.5, fontWeight: 900, color: '#1a1c20', textTransform: 'uppercase' }}>OFICIAL</span>
                </div>
              </div>
              <div className="text-center">
                <div style={{ height: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 3 }}>
                  <div style={{ width: 110, borderBottom: '1px solid #1a1c20', paddingBottom: 3 }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 10, color: '#374151', opacity: 0.7 }}>Lic. M. Valverde S.</span>
                  </div>
                </div>
                <p style={{ fontSize: 8, fontWeight: 800, color: '#1a1c20', marginTop: 2 }}>Lic. Marcelo Valverde S.</p>
                <p style={{ fontSize: 7, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 1 }}>Firma Institucional</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción del demo */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
          <button
            type="button"
            onClick={onOpenDemo}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black shadow-lg shadow-amber-500/25 transition cursor-pointer"
          >
            <Award className="w-4 h-4" />
            Ver Diploma Completo
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2e3138] hover:bg-[#363940] text-white text-xs font-bold border border-[#40444b] transition cursor-pointer"
          >
            {copiedDemo ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copiedDemo ? 'Enlace copiado' : 'Copiar enlace de verificación'}
          </button>
        </div>
      </div>
    </div>
  );
}

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

      {/* ── Certificado Demo del Estudiante ── */}
      <DemoCertificateBanner
        onOpenDemo={() => {
          // Abre el modal con datos del demo (enrollmentId ficticio -1 para modo demo)
          const demoCert: CertificateData = {
            id: 0,
            code: DEMO_CERT.code,
            enrollmentId: -1,
            userId: 0,
            courseId: 0,
            studentName: DEMO_CERT.studentName,
            courseTitle: DEMO_CERT.courseTitle,
            workloadHours: DEMO_CERT.workloadHours,
            issuedAt: DEMO_CERT.issuedAt,
          };
          onOpenCertificateModal(-1, demoCert);
        }}
      />

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
