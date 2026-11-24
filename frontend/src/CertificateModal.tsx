import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Award,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  Loader2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export interface CertificateData {
  id: number;
  code: string;
  enrollmentId: number;
  userId: number;
  courseId: number;
  studentName: string;
  courseTitle: string;
  workloadHours: number;
  issuedAt: string;
  courseSlug?: string;
}

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollmentId: number | null;
  initialCertificate?: CertificateData | null;
  onOpenVerify?: (code: string) => void;
}

export default function CertificateModal({
  isOpen,
  onClose,
  enrollmentId,
  initialCertificate,
  onOpenVerify,
}: CertificateModalProps) {
  const [certificate, setCertificate] = useState<CertificateData | null>(
    initialCertificate || null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialCertificate) {
      setCertificate(initialCertificate);
      return;
    }
    if (enrollmentId && enrollmentId > 0) fetchCertificate(enrollmentId);
  }, [isOpen, enrollmentId, initialCertificate]);

  const fetchCertificate = async (enrId: number) => {
    // Guardia: nunca hacer fetch para enrollmentId inválido (demo, etc.)
    if (enrId <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const getRes = await fetch(`/api/certificates/enrollment/${enrId}`, {
        credentials: 'include',
      });
      if (getRes.ok) {
        setCertificate(await getRes.json());
        return;
      }
      const csrfCookie = document.cookie
        .split('; ')
        .find((r) => r.startsWith('csrf_token='))
        ?.split('=')[1];
      const postRes = await fetch(`/api/certificates/issue/${enrId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfCookie ? { 'x-csrf-token': csrfCookie } : {}),
        },
        credentials: 'include',
      });
      if (!postRes.ok) {
        const e = await postRes.json();
        throw new Error(e.message || 'Error al emitir el certificado');
      }
      setCertificate(await postRes.json());
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const verifyUrl = certificate
    ? `${window.location.origin}?verify=${encodeURIComponent(certificate.code)}`
    : '';

  const qrUrl = verifyUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=1a1c20&bgcolor=ffffff&data=${encodeURIComponent(verifyUrl)}&ecc=M`
    : '';

  const formattedDate = certificate?.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const handlePrint = () => window.print();

  const handleCopyLink = () => {
    if (!verifyUrl) return;
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (!verifyUrl || !certificate) return;
    const shareData = {
      title: `Certificado: ${certificate.courseTitle}`,
      text: `¡Obtuve mi certificado en ${certificate.courseTitle}! Puedes verificarlo aquí:`,
      url: verifyUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-start justify-center p-2 sm:p-6 print:p-0 print:bg-white print:static">
      {/* ============================================================ */}
      {/* Estilos de Impresión A4 Landscape                            */}
      {/* ============================================================ */}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * { visibility: hidden; }
          #cert-printable, #cert-printable * { visibility: visible; }
          #cert-printable {
            position: fixed !important;
            inset: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="relative w-full max-w-6xl bg-[#1a1c20] border border-[#363940] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[97vh] print:max-h-none print:bg-transparent print:border-none print:shadow-none mt-4 sm:mt-0">

        {/* ── Barra de Acciones ── */}
        <div className="no-print flex items-center justify-between px-5 py-3.5 border-b border-[#2e3138] bg-[#111316] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shrink-0">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white leading-tight">Certificado Oficial</h3>
              <p className="text-[11px] text-[#9EA3AC]">Acreditación Digital Verificable</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {certificate && (
              <>
                {/* Compartir */}
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#23262d] hover:bg-[#2e3138] text-slate-200 hover:text-white text-xs font-bold border border-[#363940] transition cursor-pointer"
                >
                  {shareSuccess ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {shareSuccess ? '¡Compartido!' : 'Compartir'}
                  </span>
                </button>

                {/* Copiar enlace */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#23262d] hover:bg-[#2e3138] text-slate-200 hover:text-white text-xs font-bold border border-[#363940] transition cursor-pointer"
                  title="Copiar enlace de verificación"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar Enlace'}</span>
                </button>

                {/* Validar */}
                {onOpenVerify && (
                  <button
                    type="button"
                    onClick={() => { onClose(); onOpenVerify(certificate.code); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#23262d] hover:bg-[#2e3138] text-slate-200 hover:text-white text-xs font-bold border border-[#363940] transition cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="hidden sm:inline">Validar</span>
                  </button>
                )}

                {/* Descargar PDF */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#F2412C] to-[#d4321e] hover:from-[#d4321e] hover:to-[#b82a18] text-white text-xs font-black shadow-lg shadow-[#F2412C]/30 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Descargar PDF</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#2e3138] transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Cuerpo del Modal ── */}
        <div className="p-4 sm:p-6 overflow-y-auto flex items-center justify-center bg-[#0d0f12] print:p-0 print:bg-white">
          {loading ? (
            <div className="py-28 text-center space-y-4">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto" />
              <p className="text-sm font-bold text-white">Generando certificado digital...</p>
              <p className="text-xs text-[#9EA3AC]">Verificando requisitos y firmando documento</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center max-w-sm mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <X className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white">No se pudo emitir el certificado</h4>
              <p className="text-xs text-rose-300 bg-rose-950/30 p-3 rounded-xl border border-rose-900/50">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-[#2e3138] hover:bg-[#363940] text-white text-xs font-bold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          ) : certificate ? (
            <div className="w-full flex justify-center overflow-x-auto py-2">
              {/* ============================================================
                  LIENZO OFICIAL DEL DIPLOMA — A4 HORIZONTAL (297×210mm)
                  Diseño imprimible y renderizable en pantalla.
                  ============================================================ */}
              <div
                id="cert-printable"
                className="relative bg-white text-[#1a1c20] shadow-2xl box-border flex flex-col justify-between overflow-hidden"
                style={{ width: '1050px', height: '742px' }}
              >
                {/* ── Franja lateral izquierda decorativa ── */}
                <div
                  className="absolute left-0 top-0 bottom-0 flex flex-col items-center justify-center"
                  style={{ width: '52px', background: '#1a1c20' }}
                >
                  <div
                    className="w-full flex flex-col items-center justify-center gap-1.5 py-6"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    <span
                      className="text-[9px] font-black uppercase tracking-[0.3em] select-none"
                      style={{ color: '#F2412C' }}
                    >
                      EducaSuite 360
                    </span>
                    <span
                      className="text-[7px] font-bold uppercase tracking-[0.2em] select-none"
                      style={{ color: '#6b7280' }}
                    >
                      Certificación Oficial
                    </span>
                    <div className="w-16 h-px bg-[#F2412C]/40 my-1" style={{ width: '1px', height: '48px', background: 'rgba(242,65,44,0.3)' }} />
                    <span
                      className="text-[7px] font-mono select-none"
                      style={{ color: '#6b7280', letterSpacing: '0.15em' }}
                    >
                      {certificate.code}
                    </span>
                  </div>
                </div>

                {/* ── Marco interior con borde rojo ── */}
                <div
                  className="absolute"
                  style={{
                    top: '14px', left: '62px', right: '14px', bottom: '14px',
                    border: '1.5px solid rgba(242,65,44,0.35)',
                    pointerEvents: 'none',
                  }}
                />
                {/* Esquinas de acento */}
                {[
                  { top: 10, left: 58 },
                  { top: 10, right: 10 },
                  { bottom: 10, left: 58 },
                  { bottom: 10, right: 10 },
                ].map((pos, i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      ...pos,
                      width: 20, height: 20,
                      borderTop: i < 2 ? '2.5px solid #F2412C' : undefined,
                      borderBottom: i >= 2 ? '2.5px solid #F2412C' : undefined,
                      borderLeft: (i === 0 || i === 2) ? '2.5px solid #F2412C' : undefined,
                      borderRight: (i === 1 || i === 3) ? '2.5px solid #F2412C' : undefined,
                      pointerEvents: 'none',
                    }}
                  />
                ))}

                {/* ── Contenido Principal ── */}
                <div
                  className="relative z-10 h-full flex flex-col justify-between"
                  style={{ paddingLeft: '72px', paddingRight: '28px', paddingTop: '28px', paddingBottom: '24px' }}
                >
                  {/* 1. CABECERA */}
                  <div className="flex items-start justify-between" style={{ borderBottom: '1.5px solid #e5e7eb', paddingBottom: '18px' }}>
                    {/* Logo e Institución */}
                    <div className="flex items-center gap-4">
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: 54, height: 54, borderRadius: 14,
                          background: '#1a1c20',
                          border: '2px solid #F2412C',
                          boxShadow: '0 4px 12px rgba(242,65,44,0.25)',
                        }}
                      >
                        <span className="font-black text-white" style={{ fontSize: 18, letterSpacing: '-0.03em' }}>
                          E<span style={{ color: '#F2412C' }}>360</span>
                        </span>
                      </div>
                      <div>
                        <h1
                          className="font-black uppercase tracking-tight"
                          style={{ fontSize: 15, color: '#1a1c20', letterSpacing: '0.03em' }}
                        >
                          EducaSuite 360
                        </h1>
                        <p
                          className="font-bold uppercase"
                          style={{ fontSize: 9, color: '#6b7280', letterSpacing: '0.12em', marginTop: 2 }}
                        >
                          Centro de Especialización y Formación Continua
                        </p>
                        <p
                          className="font-mono"
                          style={{ fontSize: 8, color: '#9ca3af', marginTop: 1 }}
                        >
                          Acreditación Digital Certificada · verificar.educasuite360.com
                        </p>
                      </div>
                    </div>

                    {/* QR + Código */}
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end" style={{ gap: 3 }}>
                        <span
                          className="font-black uppercase"
                          style={{ fontSize: 8, color: '#6b7280', letterSpacing: '0.12em' }}
                        >
                          Código de Validación
                        </span>
                        <span
                          className="font-mono font-black"
                          style={{
                            fontSize: 11, color: '#1a1c20',
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            padding: '2px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {certificate.code}
                        </span>
                        <span style={{ fontSize: 7.5, color: '#9ca3af', marginTop: 1 }}>
                          Escanear para verificar autenticidad
                        </span>
                      </div>
                      {/* QR de verificación */}
                      <div
                        style={{
                          width: 72, height: 72,
                          border: '1px solid #d1d5db',
                          borderRadius: 10,
                          background: '#fff',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        }}
                      >
                        {qrUrl ? (
                          <img src={qrUrl} alt="QR de verificación" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: '#f3f4f6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 7, color: '#9ca3af', textAlign: 'center' }}>QR de<br />verificación</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. CUERPO CENTRAL */}
                  <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ padding: '16px 0 8px' }}>
                    {/* Badge */}
                    <div
                      className="inline-flex items-center gap-2"
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 999,
                        padding: '5px 16px',
                        marginBottom: 14,
                      }}
                    >
                      <CheckCircle2
                        style={{ width: 14, height: 14, color: '#16a34a', flexShrink: 0 }}
                      />
                      <span
                        className="font-black uppercase"
                        style={{ fontSize: 10, color: '#14532d', letterSpacing: '0.15em' }}
                      >
                        Certificado de Aprobación y Finalización
                      </span>
                    </div>

                    <p
                      className="uppercase font-semibold"
                      style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.12em', marginBottom: 10, fontFamily: 'Georgia, serif' }}
                    >
                      Por cuanto se acredita formalmente que:
                    </p>

                    {/* Nombre del Estudiante — el elemento más grande */}
                    <h2
                      className="font-black tracking-tight"
                      style={{
                        fontSize: 44,
                        color: '#1a1c20',
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        lineHeight: 1.1,
                        marginBottom: 8,
                      }}
                    >
                      {certificate.studentName}
                    </h2>

                    {/* Línea decorativa bajo el nombre */}
                    <div
                      style={{
                        width: 220, height: 2,
                        background: 'linear-gradient(to right, transparent, #F2412C, transparent)',
                        marginBottom: 14,
                        borderRadius: 2,
                      }}
                    />

                    <p
                      style={{
                        fontSize: 10, color: '#6b7280',
                        maxWidth: 580, lineHeight: 1.6,
                        marginBottom: 12,
                      }}
                    >
                      Ha completado y aprobado satisfactoriamente todos los módulos académicos, evaluaciones
                      y lecciones del programa de formación especializada:
                    </p>

                    {/* Nombre del Curso */}
                    <h3
                      className="font-black tracking-tight"
                      style={{
                        fontSize: 22,
                        color: '#1a1c20',
                        maxWidth: 640,
                        lineHeight: 1.25,
                        marginBottom: 16,
                      }}
                    >
                      «{certificate.courseTitle}»
                    </h3>

                    {/* Metadatos */}
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      {[
                        { label: 'Carga Horaria', value: `${certificate.workloadHours} horas académicas` },
                        { label: 'Modalidad', value: 'Virtual 100% Asistida' },
                        { label: 'Fecha de Emisión', value: formattedDate },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          style={{
                            background: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: 8,
                            padding: '5px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ fontSize: 7.5, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{label}</span>
                          <span style={{ fontSize: 10, color: '#1a1c20', fontWeight: 800, marginTop: 1 }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. PIE: FIRMAS Y SELLO */}
                  <div
                    className="grid"
                    style={{
                      borderTop: '1.5px solid #e5e7eb',
                      paddingTop: 16,
                      gridTemplateColumns: '1fr auto 1fr',
                      gap: 24,
                      alignItems: 'end',
                    }}
                  >
                    {/* Firma Docente */}
                    <div className="text-center">
                      <div style={{ height: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
                        <div style={{ width: 160, borderBottom: '1.5px solid #1a1c20', paddingBottom: 4 }}>
                          <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 13, color: '#374151', opacity: 0.7 }}>
                            Consejo Académico
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: 10, fontWeight: 800, color: '#1a1c20', marginTop: 4 }}>Consejo Académico</p>
                      <p style={{ fontSize: 8.5, color: '#6b7280', fontWeight: 600 }}>Dirección de Formación Continua</p>
                      <p style={{ fontSize: 7.5, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
                        Autoridad Académica
                      </p>
                    </div>

                    {/* Sello Central */}
                    <div className="flex flex-col items-center">
                      <div
                        style={{
                          width: 72, height: 72, borderRadius: '50%',
                          border: '2.5px solid #1a1c20',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: '#fff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      >
                        <div
                          style={{
                            width: 60, height: 60, borderRadius: '50%',
                            border: '1.5px dashed #F2412C',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: 1,
                          }}
                        >
                          <span style={{ fontSize: 7, fontWeight: 900, color: '#1a1c20', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SELLO</span>
                          <span style={{ fontSize: 7, fontWeight: 900, color: '#1a1c20', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OFICIAL</span>
                          <span style={{ fontSize: 14, color: '#F2412C', lineHeight: 1 }}>★</span>
                          <span style={{ fontSize: 6.5, fontWeight: 900, color: '#1a1c20', textTransform: 'uppercase', letterSpacing: '0.05em' }}>VALIDADO</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 8, fontWeight: 800, color: '#1a1c20', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 6 }}>
                        La Paz, Bolivia
                      </span>
                    </div>

                    {/* Firma Institución */}
                    <div className="text-center">
                      <div style={{ height: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
                        <div style={{ width: 160, borderBottom: '1.5px solid #1a1c20', paddingBottom: 4 }}>
                          <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 13, color: '#374151', opacity: 0.7 }}>
                            Lic. M. Valverde S.
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: 10, fontWeight: 800, color: '#1a1c20', marginTop: 4 }}>Lic. Marcelo Valverde S.</p>
                      <p style={{ fontSize: 8.5, color: '#6b7280', fontWeight: 600 }}>Dirección Académica y Certificaciones</p>
                      <p style={{ fontSize: 7.5, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
                        Firma Institucional
                      </p>
                    </div>
                  </div>

                  {/* Aviso legal */}
                  <div style={{ textAlign: 'center', paddingTop: 8 }}>
                    <p style={{ fontSize: 7.5, color: '#d1d5db', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                      Documento de acreditación digital emitido por EducaSuite 360 · Código único: {certificate.code} · Verificar en: {verifyUrl}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
