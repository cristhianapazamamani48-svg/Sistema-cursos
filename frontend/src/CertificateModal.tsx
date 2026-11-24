import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Award,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  ShieldCheck,
  QrCode as QrIcon,
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

  useEffect(() => {
    if (!isOpen) return;

    if (initialCertificate) {
      setCertificate(initialCertificate);
      return;
    }

    if (enrollmentId) {
      fetchCertificate(enrollmentId);
    }
  }, [isOpen, enrollmentId, initialCertificate]);

  const fetchCertificate = async (enrId: number) => {
    setLoading(true);
    setError(null);
    try {
      // Intentar primero obtener el certificado existente
      const getRes = await fetch(`/api/certificates/enrollment/${enrId}`, {
        credentials: 'include',
      });

      if (getRes.ok) {
        const data = await getRes.json();
        setCertificate(data);
        return;
      }

      // Si no existe, emitirlo automáticamente
      const csrfCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrf_token='))
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
        const errData = await postRes.json();
        throw new Error(errData.message || 'Error al emitir el certificado');
      }

      const newCert = await postRes.json();
      setCertificate(newCert);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const verifyUrl = certificate
    ? `${window.location.origin}?verify=${encodeURIComponent(certificate.code)}`
    : '';

  const handleCopyLink = () => {
    if (!verifyUrl) return;
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const formattedDate = certificate?.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  // QR Code URL pública de verificación
  const qrCodeUrl = certificate
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`
    : '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      {/* Estilos específicos de impresión (A4 horizontal) */}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-certificate, #printable-certificate * {
            visibility: visible;
          }
          #printable-certificate {
            position: fixed;
            left: 0;
            top: 0;
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-5xl bg-[#2B2D33] border border-[#40444B] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh] print:max-h-none print:bg-transparent print:border-none print:shadow-none">
        {/* Barra Superior de Acciones (No se imprime) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-[#40444B] bg-[#1E2024]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F2412C]/20 border border-[#F2412C]/30 flex items-center justify-center text-[#F2412C]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Certificado Oficial de Aprobación</h3>
              <p className="text-xs text-[#9EA3AC]">Registro Único de Acreditación Digital</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {certificate && (
              <>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2B2D33] hover:bg-[#363940] text-slate-200 hover:text-white text-xs font-bold border border-[#40444B] transition cursor-pointer"
                  title="Copiar enlace de verificación"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copiado' : 'Copiar Enlace'}</span>
                </button>

                {onOpenVerify && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenVerify(certificate.code);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2B2D33] hover:bg-[#363940] text-slate-200 hover:text-white text-xs font-bold border border-[#40444B] transition cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Validar</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#F2412C] hover:bg-[#d4321e] text-white text-xs font-black shadow-md shadow-[#F2412C]/30 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Descargar / Imprimir PDF</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#363940] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Modal con el Diploma */}
        <div className="p-4 sm:p-8 overflow-y-auto flex items-center justify-center bg-[#1A1C20] print:p-0 print:bg-white">
          {loading ? (
            <div className="py-24 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-[#F2412C] animate-spin mx-auto" />
              <p className="text-sm font-bold text-white">Generando y acreditando certificado digital...</p>
              <p className="text-xs text-[#9EA3AC]">Verificando completitud y registrando firma criptográfica</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <X className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">No se pudo emitir el certificado</h4>
              <p className="text-xs text-rose-300 bg-rose-950/40 p-3 rounded-xl border border-rose-900/50">
                {error}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#363940] hover:bg-[#40444B] text-white text-xs font-bold transition"
              >
                Cerrar
              </button>
            </div>
          ) : certificate ? (
            /* ============================================================ */
            /* LIENZO DEL DIPLOMA OFICIAL (Diseño A4 Horizontal Elegante)     */
            /* ============================================================ */
            <div className="w-full flex justify-center overflow-x-auto py-2">
              <div
                id="printable-certificate"
                className="relative bg-white text-[#2B2D33] border-4 border-[#2B2D33] shadow-2xl rounded-sm box-border flex flex-col justify-between overflow-hidden"
                style={{
                  width: '1000px',
                  minHeight: '700px',
                  aspectRatio: '1.414 / 1', // Ratio A4 Landscape
                }}
              >
                {/* Bordes decorativos con línea de acento #F2412C */}
                <div className="absolute top-2 left-2 right-2 bottom-2 border-2 border-[#D1D5DB] pointer-events-none" />
                <div className="absolute top-3.5 left-3.5 right-3.5 bottom-3.5 border border-[#F2412C]/60 pointer-events-none" />

                {/* Esquinas decorativas */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#F2412C]" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#F2412C]" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#F2412C]" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#F2412C]" />

                <div className="relative z-10 h-full flex flex-col justify-between p-10 sm:p-14">
                  {/* Encabezado del Certificado */}
                  <div className="flex items-start justify-between border-b-2 border-[#E4E6EA] pb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#2B2D33] border-2 border-[#F2412C] flex items-center justify-center shrink-0 shadow-md">
                        <span className="text-xl font-black text-white tracking-tighter">
                          E<span className="text-[#F2412C]">360</span>
                        </span>
                      </div>
                      <div>
                        <h1 className="text-base font-black tracking-tight text-[#2B2D33] uppercase">
                          EducaSuite 360
                        </h1>
                        <p className="text-[11px] font-bold text-[#636870] uppercase tracking-wider">
                          Plataforma de Formación Continua y Especialización
                        </p>
                        <p className="text-[9px] text-[#9EA3AC] font-mono">
                          Certificación Oficial de Competencias Digitales
                        </p>
                      </div>
                    </div>

                    {/* Código de Validación y Código QR */}
                    <div className="flex items-center gap-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black uppercase tracking-wider text-[#636870]">
                          Código de Validación
                        </span>
                        <span className="text-xs font-mono font-black text-[#2B2D33] bg-[#E4E6EA] px-2 py-0.5 rounded border border-[#D1D5DB] mt-0.5">
                          {certificate.code}
                        </span>
                        <span className="text-[8px] text-[#9EA3AC] mt-0.5">
                          Escanear para comprobar autenticidad
                        </span>
                      </div>
                      <div className="w-14 h-14 rounded-lg border border-[#D1D5DB] bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                        {qrCodeUrl ? (
                          <img src={qrCodeUrl} alt="QR Verificación" className="w-full h-full object-contain" />
                        ) : (
                          <QrIcon className="w-10 h-10 text-[#2B2D33]" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cuerpo Central */}
                  <div className="text-center my-auto py-6 space-y-3">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-black uppercase tracking-widest text-emerald-900">
                        Certificado de Aprobación y Finalización
                      </span>
                    </div>

                    <p className="text-xs uppercase tracking-widest font-semibold text-[#636870]">
                      Se certifica formalmente que:
                    </p>

                    <h2 className="text-3xl sm:text-4xl font-black text-[#2B2D33] tracking-tight font-serif py-1">
                      {certificate.studentName}
                    </h2>

                    <p className="text-xs text-[#555861] max-w-xl mx-auto leading-relaxed">
                      Ha completado satisfactoriamente el 100% de los módulos académicos, evaluaciones y exigencias
                      del programa de formación especializada:
                    </p>

                    <div className="py-2">
                      <h3 className="text-xl sm:text-2xl font-black text-[#F2412C] max-w-2xl mx-auto leading-snug">
                        «{certificate.courseTitle}»
                      </h3>
                    </div>

                    <p className="text-xs font-bold text-[#636870]">
                      Carga Horaria Acreditada: <span className="text-[#2B2D33] font-black">{certificate.workloadHours} horas académicas</span>
                    </p>
                  </div>

                  {/* Pie de Firma y Sello Oficial */}
                  <div className="pt-6 border-t border-[#E4E6EA] flex items-end justify-between">
                    {/* Fecha de Emisión */}
                    <div className="text-left text-xs space-y-0.5">
                      <p className="text-[10px] font-bold text-[#9EA3AC] uppercase">Fecha de Emisión</p>
                      <p className="font-bold text-[#2B2D33]">{formattedDate}</p>
                    </div>

                    {/* Sello de Acreditación Digital */}
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full border-2 border-emerald-600 bg-emerald-50 flex flex-col items-center justify-center shadow-xs">
                        <Award className="w-6 h-6 text-emerald-600" />
                        <span className="text-[8px] font-black uppercase tracking-tighter text-emerald-900">Acreditado</span>
                      </div>
                      <span className="text-[9px] font-bold text-[#636870] mt-1 font-mono">Firma Digital Verificada</span>
                    </div>

                    {/* Firma de Autoridad */}
                    <div className="text-center w-48">
                      <div className="border-b border-[#2B2D33] pb-1 mb-1 font-serif italic text-xs text-[#555861]">
                        Dirección Académica
                      </div>
                      <p className="text-[11px] font-black text-[#2B2D33]">Consejo Académico EducaSuite</p>
                      <p className="text-[9px] text-[#9EA3AC]">Firma Institucional</p>
                    </div>
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
