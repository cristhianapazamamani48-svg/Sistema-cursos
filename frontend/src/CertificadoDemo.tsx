import React, { useState } from 'react';
import { Printer, ArrowLeft, Award, CheckCircle2, QrCode } from 'lucide-react';

interface CertData {
  studentName: string;
  courseName: string;
  teacherName: string;
  teacherTitle: string;
  completionDate: string;
  hoursCount: number;
  verificationCode: string;
  institutionName: string;
  cityCountry: string;
}

const DEMO_PRESETS: CertData[] = [
  {
    studentName: 'María Elena Condori Mamani',
    courseName: 'Desarrollo Web Fullstack con React y Node.js',
    teacherName: 'Ing. Carlos Alberto Flores',
    teacherTitle: 'Docente Titular de Ingeniería de Software',
    completionDate: '9 de noviembre de 2026',
    hoursCount: 64,
    verificationCode: 'EDU-2026-A3F7K9',
    institutionName: 'EducaSuite 360',
    cityCountry: 'La Paz, Bolivia',
  },
  {
    studentName: 'Juan Pablo Quispe Choque',
    courseName: 'Inteligencia Artificial y Machine Learning Aplicado',
    teacherName: 'Dra. Patricia Morales Vaca',
    teacherTitle: 'Directora del Área de Ciencia de Datos',
    completionDate: '15 de octubre de 2026',
    hoursCount: 80,
    verificationCode: 'EDU-2026-B8X2M4',
    institutionName: 'EducaSuite 360',
    cityCountry: 'Cochabamba, Bolivia',
  },
  {
    studentName: 'Sofía Andrea Rodríguez Torrico',
    courseName: 'Diseño UX/UI Avanzado y Sistemas de Diseño',
    teacherName: 'Lic. Rodrigo Paz Mendizábal',
    teacherTitle: 'Especialista Principal en Producto Digital',
    completionDate: '28 de septiembre de 2026',
    hoursCount: 48,
    verificationCode: 'EDU-2026-C1Q5T8',
    institutionName: 'EducaSuite 360',
    cityCountry: 'Santa Cruz, Bolivia',
  },
];

export default function CertificadoDemo() {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const data = DEMO_PRESETS[selectedPresetIndex];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#E4E6EA] text-[#2B2D33]">
      {/* ============================================================ */}
      {/* Estilos específicos de impresión (A4 horizontal)              */}
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
            background: #FFFFFF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .cert-outer-container {
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            min-height: 0 !important;
          }

          .cert-paper {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
        }

        @media screen {
          .cert-paper {
            width: 297mm;
            min-height: 210mm;
            height: 210mm;
          }
        }
      `}</style>

      {/* ============================================================ */}
      {/* Barra de Controles Superior (No se imprime)                  */}
      {/* ============================================================ */}
      <header className="no-print sticky top-0 z-50 bg-[#2B2D33] border-b border-[#40444B] px-4 sm:px-8 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo y volver */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#40444B] hover:bg-[#50545C] text-white text-xs font-bold transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Catálogo
            </a>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F2412C]"></span>
              <span className="text-white font-black text-sm tracking-tight">EducaSuite 360</span>
              <span className="text-[10px] font-bold text-[#E4E6EA] bg-[#40444B] px-2 py-0.5 rounded-full uppercase">
                Certificado Imprimible
              </span>
            </div>
          </div>

          {/* Selector de ejemplos + Botón imprimir */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
            <div className="flex items-center gap-2 bg-[#1A1C20] px-3 py-1.5 rounded-xl border border-[#40444B]">
              <span className="text-[11px] font-semibold text-[#9EA3AC] hidden sm:inline">Ejemplo:</span>
              <select
                value={selectedPresetIndex}
                onChange={(e) => setSelectedPresetIndex(Number(e.target.value))}
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
              >
                {DEMO_PRESETS.map((p, idx) => (
                  <option key={p.verificationCode} value={idx} className="bg-[#2B2D33] text-white">
                    {p.studentName} — {p.courseName.slice(0, 24)}...
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F2412C] hover:bg-[#d4321e] text-white text-xs font-black shadow-md shadow-[#F2412C]/20 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Descargar PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* Contenedor de la Hoja A4                                      */}
      {/* ============================================================ */}
      <main className="cert-outer-container py-8 sm:py-12 px-2 sm:px-6 flex justify-center items-center overflow-x-auto">
        <article className="cert-paper relative bg-white border border-[#D1D5DB] shadow-2xl rounded-sm box-border flex flex-col justify-between overflow-hidden">
          
          {/* ---- Marco Geométrico Decorativo (Solido, sin degradados) ---- */}
          {/* Borde exterior superior e inferior */}
          <div className="absolute top-0 left-0 right-0 h-[8px] bg-[#2B2D33]" />
          <div className="absolute bottom-0 left-0 right-0 h-[8px] bg-[#2B2D33]" />
          
          {/* Bandas laterales */}
          <div className="absolute top-[8px] bottom-[8px] left-0 w-[8px] bg-[#2B2D33]" />
          <div className="absolute top-[8px] bottom-[8px] right-0 w-[8px] bg-[#2B2D33]" />

          {/* Líneas interiores en Rojo Tomate (#F2412C) */}
          <div className="absolute top-[14px] left-[14px] right-[14px] h-[2px] bg-[#F2412C]" />
          <div className="absolute bottom-[14px] left-[14px] right-[14px] h-[2px] bg-[#F2412C]" />
          <div className="absolute top-[14px] bottom-[14px] left-[14px] w-[2px] bg-[#F2412C]" />
          <div className="absolute top-[14px] bottom-[14px] right-[14px] w-[2px] bg-[#F2412C]" />

          {/* Esquinas decorativas cuadradas */}
          <div className="absolute top-[12px] left-[12px] w-[6px] h-[6px] bg-[#2B2D33]" />
          <div className="absolute top-[12px] right-[12px] w-[6px] h-[6px] bg-[#2B2D33]" />
          <div className="absolute bottom-[12px] left-[12px] w-[6px] h-[6px] bg-[#2B2D33]" />
          <div className="absolute bottom-[12px] right-[12px] w-[6px] h-[6px] bg-[#2B2D33]" />

          {/* ---- Contenido Interno con padding A4 milimétrico ---- */}
          <div className="relative z-10 h-full flex flex-col justify-between px-[22mm] py-[16mm]">
            
            {/* 1. CABECERA: Logo + Título Institucional + Código QR */}
            <div className="flex items-start justify-between border-b-2 border-[#E4E6EA] pb-4">
              
              {/* Espacio para Logo Institucional */}
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-[#2B2D33] border-2 border-[#F2412C] flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-xl font-black text-white tracking-tighter">
                    E<span className="text-[#F2412C]">360</span>
                  </span>
                </div>
                <div>
                  <h1 className="text-base font-black tracking-tight text-[#2B2D33] uppercase font-sans">
                    {data.institutionName}
                  </h1>
                  <p className="text-[10px] font-bold text-[#636870] uppercase tracking-wider font-sans">
                    Centro de Especialización y Formación Continua
                  </p>
                  <p className="text-[9px] text-[#9EA3AC] font-mono mt-0.5">
                    Registro Nacional de Acreditación Digital N° 784-B
                  </p>
                </div>
              </div>

              {/* Código de Verificación y Espacio QR */}
              <div className="flex items-center gap-3 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#636870]">
                    Código de Validación
                  </span>
                  <span className="text-xs font-mono font-black text-[#2B2D33] bg-[#E4E6EA] px-2 py-0.5 rounded border border-[#D1D5DB] mt-0.5">
                    {data.verificationCode}
                  </span>
                  <span className="text-[8px] text-[#9EA3AC] mt-0.5">
                    educasuite360.com/verificar
                  </span>
                </div>
                {/* Espacio para QR de Verificación */}
                <div className="w-12 h-12 rounded-lg border border-[#D1D5DB] bg-[#E4E6EA] p-1 flex items-center justify-center shrink-0">
                  <QrCode className="w-10 h-10 text-[#2B2D33]" />
                </div>
              </div>
            </div>

            {/* 2. CUERPO CENTRAL: Texto formal del certificado */}
            <div className="text-center my-auto py-2">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E4E6EA] border border-[#D1D5DB] mb-3">
                <Award className="w-4 h-4 text-[#F2412C]" />
                <span className="text-[11px] font-black uppercase tracking-widest text-[#2B2D33]">
                  Certificado de Aprobación y Finalización
                </span>
              </div>

              <p className="text-xs uppercase tracking-wider font-medium text-[#636870] mb-2 font-serif">
                Por cuanto se acredita formalmente que:
              </p>

              {/* Nombre del Estudiante */}
              <h2 className="text-3xl sm:text-4xl font-black text-[#2B2D33] tracking-normal font-serif mb-2">
                {data.studentName}
              </h2>

              <div className="w-48 h-[2px] bg-[#F2412C] mx-auto mb-3" />

              <p className="text-xs text-[#636870] max-w-xl mx-auto leading-relaxed font-sans mb-2">
                Ha completado y aprobado satisfactoriamente todos los módulos de estudio, proyectos de evaluación
                y lecciones requeridas con un desempeño sobresaliente en el programa académico:
              </p>

              {/* Nombre del Curso */}
              <h3 className="text-xl sm:text-2xl font-black text-[#2B2D33] font-sans tracking-tight mb-3">
                "{data.courseName}"
              </h3>

              {/* Metadatos: Horas + Fecha */}
              <div className="flex items-center justify-center gap-6 text-xs text-[#2B2D33] font-bold">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#E4E6EA] border border-[#D1D5DB]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#F2412C]" />
                  Carga Horaria: <strong>{data.hoursCount} horas académicas</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#E4E6EA] border border-[#D1D5DB]">
                  Modalidad: <strong>Virtual 100% Asistida</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#E4E6EA] border border-[#D1D5DB]">
                  Fecha: <strong>{data.completionDate}</strong>
                </span>
              </div>
            </div>

            {/* 3. PIE: Espacios para Firmas + Sello Institucional */}
            <div className="border-t-2 border-[#E4E6EA] pt-4 grid grid-cols-3 gap-6 items-end">
              
              {/* Espacio para Firma 1: Docente */}
              <div className="text-center">
                <div className="h-14 flex items-end justify-center pb-1">
                  <div className="w-40 border-b-2 border-[#2B2D33] pb-1 text-center">
                    <span className="font-serif italic text-base text-[#2B2D33] select-none opacity-80">
                      {data.teacherName.split(' ').slice(0, 2).join(' ')}
                    </span>
                  </div>
                </div>
                <p className="text-xs font-black text-[#2B2D33] mt-1">{data.teacherName}</p>
                <p className="text-[10px] font-semibold text-[#636870]">{data.teacherTitle}</p>
                <p className="text-[9px] text-[#9EA3AC] uppercase font-bold tracking-wider mt-0.5">
                  Firma del Docente
                </p>
              </div>

              {/* Sello Central / Escudo de Validación */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full border-2 border-[#2B2D33] p-1 flex items-center justify-center bg-white shadow-xs">
                  <div className="w-full h-full rounded-full border border-dashed border-[#F2412C] flex flex-col items-center justify-center text-center p-1">
                    <span className="text-[7px] font-black text-[#2B2D33] uppercase leading-none">
                      SELLO OFICIAL
                    </span>
                    <span className="text-[10px] font-black text-[#F2412C] my-0.5">★</span>
                    <span className="text-[7px] font-extrabold text-[#2B2D33] uppercase leading-none">
                      VALIDADO
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-black text-[#2B2D33] uppercase tracking-wider mt-1.5">
                  {data.cityCountry}
                </span>
              </div>

              {/* Espacio para Firma 2: Director Académico */}
              <div className="text-center">
                <div className="h-14 flex items-end justify-center pb-1">
                  <div className="w-40 border-b-2 border-[#2B2D33] pb-1 text-center">
                    <span className="font-serif italic text-base text-[#2B2D33] select-none opacity-80">
                      Lic. M. Valverde
                    </span>
                  </div>
                </div>
                <p className="text-xs font-black text-[#2B2D33] mt-1">Lic. Marcelo Valverde S.</p>
                <p className="text-[10px] font-semibold text-[#636870]">Dirección Académica y Certificaciones</p>
                <p className="text-[9px] text-[#9EA3AC] uppercase font-bold tracking-wider mt-0.5">
                  Firma de la Institución
                </p>
              </div>
            </div>

            {/* Aviso legal inferior en texto pequeño */}
            <div className="text-center pt-2">
              <p className="text-[8px] text-[#9EA3AC] font-mono tracking-tight">
                Documento emitido electrónicamente por {data.institutionName} bajo el protocolo de integridad hash SHA-256.
                La autenticidad puede ser verificada en el portal oficial ingresando el código único <strong>{data.verificationCode}</strong>.
              </p>
            </div>

          </div>
        </article>
      </main>
    </div>
  );
}
