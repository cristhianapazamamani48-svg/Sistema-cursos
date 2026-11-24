import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Award,
  Calendar,
  Clock,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

interface VerifyCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string | null;
  onViewCourse?: (slug: string) => void;
}

interface VerificationResult {
  valid: boolean;
  message?: string;
  certificate?: {
    code: string;
    studentName: string;
    courseTitle: string;
    workloadHours: number;
    issuedAt: string;
    courseSlug: string;
  };
}

export default function VerifyCertificateModal({
  isOpen,
  onClose,
  initialCode,
  onViewCourse,
}: VerifyCertificateModalProps) {
  const [code, setCode] = useState(initialCode || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    if (isOpen && initialCode) {
      setCode(initialCode);
      verifyCode(initialCode);
    } else if (isOpen) {
      setResult(null);
    }
  }, [isOpen, initialCode]);

  const verifyCode = async (targetCode: string) => {
    const cleanCode = targetCode.trim();
    if (!cleanCode) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/certificates/verify/${encodeURIComponent(cleanCode)}`);
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        valid: false,
        message: 'Error al conectar con el servidor de validación.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCode(code);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-white border border-[#D1D5DB] rounded-3xl shadow-2xl overflow-hidden animate-fade-in text-[#2B2D33]">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-6 border-b border-[#E4E6EA] bg-[#F8F9FA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#2B2D33]">
                Validación Oficial de Certificados
              </h3>
              <p className="text-xs text-[#555861]">
                Registro y comprobación de autenticidad académica
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#555861] hover:text-[#2B2D33] hover:bg-[#E4E6EA] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario de Consulta */}
        <div className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="text-xs font-bold text-[#2B2D33] block">
              Ingresa el Código Único del Certificado
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ej. CERT-2026-A1B2-C3D4"
                  className="w-full bg-[#F8F9FA] border border-[#C9CDD4] rounded-xl px-4 py-2.5 text-xs text-[#2B2D33] font-mono uppercase focus:bg-white focus:outline-none focus:border-[#F2412C]"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#F2412C] hover:bg-[#d4321e] text-white text-xs font-bold shadow-md shadow-[#F2412C]/20 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>Verificar</span>
              </button>
            </div>
            <p className="text-[11px] text-[#555861]">
              El código alfanumérico se encuentra impreso en la esquina superior derecha del certificado.
            </p>
          </form>

          {/* Resultado de la Verificación */}
          {loading && (
            <div className="py-10 text-center space-y-2">
              <Loader2 className="w-8 h-8 text-[#F2412C] animate-spin mx-auto" />
              <p className="text-xs text-[#555861] font-semibold">Consultando base de datos oficial...</p>
            </div>
          )}

          {!loading && result && (
            <div className="animate-fade-in">
              {result.valid && result.certificate ? (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2.5 text-emerald-800">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="text-sm font-black text-emerald-950">
                        Certificado Auténtico y Acreditado
                      </h4>
                      <p className="text-xs text-emerald-700">
                        El documento coincide con los registros oficiales de la institución.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-emerald-200 space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-[#636870] uppercase">Estudiante Acreditado</span>
                      <p className="text-sm font-black text-[#2B2D33]">{result.certificate.studentName}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[#636870] uppercase">Programa / Curso</span>
                      <p className="font-bold text-[#F2412C] text-xs">«{result.certificate.courseTitle}»</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E4E6EA]">
                      <div className="flex items-center gap-1.5 text-[#555861]">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{result.certificate.workloadHours} hrs académicas</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#555861]">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {new Date(result.certificate.issuedAt).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 text-[11px] font-mono text-[#555861] flex items-center justify-between">
                      <span>Código: <strong>{result.certificate.code}</strong></span>
                      <span className="text-emerald-700 font-bold">Estado: Emitido</span>
                    </div>
                  </div>

                  {onViewCourse && result.certificate.courseSlug && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onViewCourse(result.certificate!.courseSlug);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Ver Ficha del Curso</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-5 text-center space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-rose-950">
                      Certificado No Válido o No Encontrado
                    </h4>
                    <p className="text-xs text-rose-700 mt-1 max-w-sm mx-auto">
                      {result.message || 'El código ingresado no corresponde a ninguna credencial académica emitida por esta plataforma.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
