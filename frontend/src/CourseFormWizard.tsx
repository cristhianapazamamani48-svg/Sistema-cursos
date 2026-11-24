import React, { useState, useEffect } from 'react';
import {
  FileText,
  DollarSign,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Loader2,
  Lock,
  Tag,
  Clock,
  Layers,
  Info,
  Gift,
  CreditCard,
  Check,
  ChevronLeft,
} from 'lucide-react';
import { api } from './api';
import {
  courseInfoSchema,
  coursePriceSchema,
  courseThumbnailSchema,
  fullCourseFormSchema,
  POPULAR_CATEGORIES,
} from './courseValidation';
import type { ManagedCourse } from './TeacherCoursesView';

interface CourseFormWizardProps {
  isOpen?: boolean;
  onClose: () => void;
  initialCourse?: ManagedCourse | null;
  initialStep?: 1 | 2 | 3;
  onSuccess: () => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

// Portadas sugeridas de alta resolución para negocios (Unsplash)
const SUGGESTED_THUMBNAILS = [
  {
    label: 'Estrategia',
    url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop',
  },
  {
    label: 'Finanzas',
    url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop',
  },
  {
    label: 'Tecnología',
    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop',
  },
  {
    label: 'Marketing',
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop',
  },
  {
    label: 'Liderazgo',
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop',
  },
  {
    label: 'Contabilidad',
    url: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&auto=format&fit=crop',
  },
];

const QUICK_PRICES = ['100', '180', '250', '320', '450'];

export default function CourseFormWizard({
  isOpen = true,
  onClose,
  initialCourse,
  initialStep = 1,
  onSuccess,
  showToast,
}: CourseFormWizardProps) {
  const isEditMode = Boolean(initialCourse);

  // Paso actual (1: Info, 2: Precio, 3: Portada)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(initialStep || 1);

  // Paso 1: Información
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  // Paso 2: Precio
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('0');
  const [minWatchPercentage, setMinWatchPercentage] = useState(85);

  // Paso 3: Portada
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [imgError, setImgError] = useState(false);

  // Errores de validación en vivo
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Estado de envío
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar formulario al abrir o cambiar curso
  useEffect(() => {
    if (initialCourse) {
      setTitle(initialCourse.title || '');
      setSlug(initialCourse.slug || '');
      setAutoSlug(false);
      setDescription(initialCourse.description || '');
      setCategory(initialCourse.category || '');
      const numPrice = Number(initialCourse.price) || 0;
      setIsFree(numPrice === 0);
      setPrice(numPrice > 0 ? String(numPrice) : '0');
      setMinWatchPercentage(initialCourse.minWatchPercentage || 85);
      setThumbnailUrl(initialCourse.thumbnailUrl || '');
    } else {
      setTitle('');
      setSlug('');
      setAutoSlug(true);
      setDescription('');
      setCategory('');
      setIsFree(true);
      setPrice('0');
      setMinWatchPercentage(85);
      setThumbnailUrl('');
    }
    setErrors({});
    setTouched({});
    setCurrentStep(initialStep || 1);
    setImgError(false);
  }, [initialCourse, isOpen, initialStep]);

  if (!isOpen) return null;

  // Generador de slug a partir del título
  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    const newSlug = autoSlug ? slugify(val) : slug;
    if (autoSlug) {
      setSlug(newSlug);
    }
    validateField('title', val);
    if (autoSlug) {
      validateField('slug', newSlug);
    }
  };

  const handleSlugChange = (val: string) => {
    setAutoSlug(false);
    const cleanSlug = slugify(val);
    setSlug(cleanSlug);
    validateField('slug', cleanSlug);
  };

  const validateField = (fieldName: string, value: any) => {
    let result;
    if (fieldName === 'title' || fieldName === 'slug' || fieldName === 'description' || fieldName === 'category') {
      const dataToValidate = {
        title: fieldName === 'title' ? value : title,
        slug: fieldName === 'slug' ? value : slug,
        description: fieldName === 'description' ? value : description,
        category: fieldName === 'category' ? value : category,
      };
      result = courseInfoSchema.safeParse(dataToValidate);
    } else if (fieldName === 'price' || fieldName === 'isFree' || fieldName === 'minWatchPercentage') {
      const dataToValidate = {
        isFree: fieldName === 'isFree' ? value : isFree,
        price: fieldName === 'price' ? Number(value) : (isFree ? 0 : Number(price)),
        currency: 'BOB' as const,
        minWatchPercentage: fieldName === 'minWatchPercentage' ? Number(value) : minWatchPercentage,
      };
      result = coursePriceSchema.safeParse(dataToValidate);
    } else if (fieldName === 'thumbnailUrl') {
      result = courseThumbnailSchema.safeParse({ thumbnailUrl: value });
    }

    if (result && !result.success) {
      const fieldError = result.error.errors.find((err) => err.path.includes(fieldName));
      setErrors((prev) => {
        if (fieldError) {
          return { ...prev, [fieldName]: fieldError.message };
        } else {
          const updated = { ...prev };
          delete updated[fieldName];
          return updated;
        }
      });
    } else {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[fieldName];
        return updated;
      });
    }
  };

  const markTouched = (fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  };

  const validateStep1 = (): boolean => {
    const res = courseInfoSchema.safeParse({
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
    });

    if (!res.success) {
      const stepErrors: Record<string, string> = {};
      res.error.errors.forEach((err) => {
        const key = String(err.path[0]);
        stepErrors[key] = err.message;
      });
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      setTouched({ title: true, slug: true, description: true, category: true });
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    const res = coursePriceSchema.safeParse({
      isFree,
      price: isFree ? 0 : Number(price),
      currency: 'BOB',
      minWatchPercentage: Number(minWatchPercentage) || 85,
    });

    if (!res.success) {
      const stepErrors: Record<string, string> = {};
      res.error.errors.forEach((err) => {
        const key = String(err.path[0]);
        stepErrors[key] = err.message;
      });
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      setTouched((prev) => ({ ...prev, price: true, minWatchPercentage: true }));
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    const res = courseThumbnailSchema.safeParse({
      thumbnailUrl: thumbnailUrl.trim() || undefined,
    });

    if (!res.success) {
      const stepErrors: Record<string, string> = {};
      res.error.errors.forEach((err) => {
        const key = String(err.path[0]);
        stepErrors[key] = err.message;
      });
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      setTouched((prev) => ({ ...prev, thumbnailUrl: true }));
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      showToast('error', 'Por favor corrige los campos indicados en el formulario');
      return;
    }

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      price: isFree ? 0 : Number(price) || 0,
      currency: 'BOB' as const,
      status: isEditMode && initialCourse ? initialCourse.status : ('draft' as const),
      minWatchPercentage: Number(minWatchPercentage) || 85,
    };

    const validation = fullCourseFormSchema.safeParse(payload);
    if (!validation.success) {
      showToast('error', validation.error.errors[0]?.message || 'Datos del curso inválidos');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && initialCourse) {
        const res = await api(`/api/courses/${initialCourse.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Error al actualizar curso');
        }

        showToast('success', `¡Curso "${data.title}" actualizado con éxito!`);
      } else {
        const res = await api('/api/courses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Error al crear curso');
        }

        showToast('success', `¡Curso "${data.title}" creado con éxito en borrador!`);
      }

      onSuccess();
    } catch (err: any) {
      showToast('error', err.message || 'Ocurrió un error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#2B2D33] pb-12">
      {/* ── BARRA SUPERIOR DE RETORNO Y TÍTULO DE LA PÁGINA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D1D5DB]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white hover:bg-slate-100 text-[#2B2D33] border border-[#D1D5DB] shadow-xs transition cursor-pointer"
            title="Volver al listado de cursos"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#F2412C] bg-[#F2412C]/10 px-2.5 py-0.5 rounded border border-[#F2412C]/20">
                {isEditMode ? 'Edición de Programa' : 'Nuevo Programa'}
              </span>
              <span className="text-xs text-[#555861]">Paso {currentStep} de 3</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#2B2D33] tracking-tight mt-0.5">
              {isEditMode ? `Editar: ${initialCourse?.title}` : 'Crear Nuevo Curso'}
            </h1>
          </div>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#555861] text-xs font-bold border border-[#D1D5DB] transition cursor-pointer"
          >
            Cancelar
          </button>
          {currentStep === 3 ? (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#F2412C] hover:bg-[#d4321e] text-white text-xs font-black shadow-md shadow-[#F2412C]/20 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditMode ? 'Guardar Cambios' : 'Crear Curso'}</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#F2412C] hover:bg-[#d4321e] text-white text-xs font-black shadow-md shadow-[#F2412C]/20 transition cursor-pointer"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── INDICADOR DE PASOS TIPO WIZARD ── */}
      <div className="bg-white border border-[#D1D5DB] rounded-3xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Paso 1 */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-3 p-3 rounded-2xl text-left transition cursor-pointer border ${
              currentStep === 1
                ? 'bg-amber-50/50 border-[#F2412C] shadow-xs'
                : currentStep > 1
                ? 'bg-emerald-50/40 border-emerald-300'
                : 'bg-[#F8F9FA] border-[#D1D5DB]'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 shadow-xs ${
                currentStep === 1
                  ? 'bg-[#F2412C] text-white'
                  : currentStep > 1
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-[#636870] border border-[#D1D5DB]'
              }`}
            >
              {currentStep > 1 ? <Check className="w-5 h-5 stroke-[3]" /> : '1'}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black block text-[#2B2D33] truncate">1. Información del Curso</span>
              <span className="text-[11px] text-[#636870] truncate">Título, enlace y área temática</span>
            </div>
          </button>

          {/* Paso 2 */}
          <button
            type="button"
            onClick={() => {
              if (validateStep1()) setCurrentStep(2);
            }}
            className={`flex items-center gap-3 p-3 rounded-2xl text-left transition cursor-pointer border ${
              currentStep === 2
                ? 'bg-amber-50/50 border-[#F2412C] shadow-xs'
                : currentStep > 2
                ? 'bg-emerald-50/40 border-emerald-300'
                : 'bg-[#F8F9FA] border-[#D1D5DB]'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 shadow-xs ${
                currentStep === 2
                  ? 'bg-[#F2412C] text-white'
                  : currentStep > 2
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-[#636870] border border-[#D1D5DB]'
              }`}
            >
              {currentStep > 2 ? <Check className="w-5 h-5 stroke-[3]" /> : '2'}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black block text-[#2B2D33] truncate">2. Precio y Exigencia</span>
              <span className="text-[11px] text-[#636870] truncate">Gratuito o en Bolivianos (Bs.)</span>
            </div>
          </button>

          {/* Paso 3 */}
          <button
            type="button"
            onClick={() => {
              if (validateStep1() && validateStep2()) setCurrentStep(3);
            }}
            className={`flex items-center gap-3 p-3 rounded-2xl text-left transition cursor-pointer border ${
              currentStep === 3
                ? 'bg-amber-50/50 border-[#F2412C] shadow-xs'
                : 'bg-[#F8F9FA] border-[#D1D5DB]'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 shadow-xs ${
                currentStep === 3
                  ? 'bg-[#F2412C] text-white'
                  : 'bg-white text-[#636870] border border-[#D1D5DB]'
              }`}
            >
              3
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black block text-[#2B2D33] truncate">3. Portada y Catálogo</span>
              <span className="text-[11px] text-[#636870] truncate">Imagen y previsualización en vivo</span>
            </div>
          </button>
        </div>
      </div>

      {/* ── CUERPO PRINCIPAL DE LA VISTA EN 2 COLUMNAS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Formulario (7 columnas en desktop) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#D1D5DB] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            {/* ======================================================== */}
            {/* PASO 1: INFORMACIÓN BÁSICA                               */}
            {/* ======================================================== */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-base font-black text-[#2B2D33] flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#F2412C]" />
                    Datos Académicos del Curso
                  </h3>
                  <p className="text-xs text-[#636870] mt-0.5">
                    Define la identidad del programa educativo tal como lo verán los postulantes.
                  </p>
                </div>

                {/* Título */}
                <div>
                  <label className="text-xs font-bold text-[#2B2D33] flex items-center justify-between mb-1.5">
                    <span>
                      Título del Curso <span className="text-rose-500">*</span>
                    </span>
                    <span className={`text-[11px] font-mono ${title.length > 100 ? 'text-amber-600 font-bold' : 'text-[#636870]'}`}>
                      {title.length}/120
                    </span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    onBlur={() => markTouched('title')}
                    placeholder="ej. Auditoría Financiera y Gestión del Flujo de Caja"
                    className={`w-full bg-[#F8F9FA] border rounded-2xl px-4 py-3 text-sm text-[#2B2D33] font-semibold placeholder-slate-400 focus:bg-white focus:outline-none transition ${
                      touched.title && errors.title
                        ? 'border-rose-500 ring-2 ring-rose-500/10'
                        : 'border-[#D1D5DB] focus:border-[#F2412C] focus:ring-2 focus:ring-[#F2412C]/10'
                    }`}
                  />
                  {touched.title && errors.title && (
                    <p className="text-[11px] text-rose-500 mt-1.5 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.title}</span>
                    </p>
                  )}
                </div>

                {/* Slug Web */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#2B2D33]">
                      Enlace permanente (Slug de acceso directo) <span className="text-rose-500">*</span>
                    </label>
                    <label className="text-[11px] text-[#636870] font-medium flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSlug}
                        onChange={(e) => {
                          setAutoSlug(e.target.checked);
                          if (e.target.checked) {
                            const auto = slugify(title);
                            setSlug(auto);
                            validateField('slug', auto);
                          }
                        }}
                        className="rounded accent-[#F2412C] cursor-pointer"
                      />
                      Autogenerar desde el título
                    </label>
                  </div>
                  <div
                    className={`flex items-center bg-[#F8F9FA] border rounded-2xl px-3.5 py-3 text-xs font-mono text-[#2B2D33] transition ${
                      touched.slug && errors.slug
                        ? 'border-rose-500 ring-2 ring-rose-500/10'
                        : 'border-[#D1D5DB] focus-within:border-[#F2412C] focus-within:bg-white'
                    }`}
                  >
                    <span className="text-[#9EA3AC] select-none font-bold">/courses/</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      onBlur={() => markTouched('slug')}
                      placeholder="auditoria-financiera-flujo-caja"
                      className="w-full bg-transparent text-[#2B2D33] focus:outline-none ml-1 font-bold"
                    />
                  </div>
                  {touched.slug && errors.slug && (
                    <p className="text-[11px] text-rose-500 mt-1.5 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.slug}</span>
                    </p>
                  )}
                </div>

                {/* Categoría con Chips interactivos */}
                <div>
                  <label className="text-xs font-bold text-[#2B2D33] flex items-center gap-1.5 mb-2">
                    <Tag className="w-4 h-4 text-[#F2412C]" />
                    Área Temática o Categoría
                  </label>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_CATEGORIES.map((cat) => {
                        const isSelected = category.toLowerCase() === cat.toLowerCase();
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              const newCat = isSelected ? '' : cat;
                              setCategory(newCat);
                              validateField('category', newCat);
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                              isSelected
                                ? 'bg-[#F2412C] text-white border-[#F2412C] shadow-sm'
                                : 'bg-[#F8F9FA] hover:bg-slate-100 text-[#555861] border-[#D1D5DB]'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        validateField('category', e.target.value);
                      }}
                      placeholder="O escribe otra área temática personalizada (ej. Comercio Exterior)..."
                      className="w-full bg-[#F8F9FA] border border-[#D1D5DB] rounded-2xl px-4 py-2.5 text-xs text-[#2B2D33] focus:bg-white focus:outline-none focus:border-[#F2412C]"
                    />
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="text-xs font-bold text-[#2B2D33] block mb-1.5">
                    Descripción del Programa
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      validateField('description', e.target.value);
                    }}
                    placeholder="Describe los objetivos formativos, público objetivo y contenidos clave que abordará el curso..."
                    className="w-full bg-[#F8F9FA] border border-[#D1D5DB] rounded-2xl px-4 py-3 text-xs text-[#2B2D33] focus:bg-white placeholder-slate-400 focus:outline-none focus:border-[#F2412C] resize-none"
                  />
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* PASO 2: PRECIO Y REQUISITOS                              */}
            {/* ======================================================== */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-base font-black text-[#2B2D33] flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#F2412C]" />
                    Modalidad y Requisitos Académicos
                  </h3>
                  <p className="text-xs text-[#636870] mt-0.5">
                    Fija el costo de matrícula en moneda boliviana y la asistencia mínima obligatoria.
                  </p>
                </div>

                {/* Tarjetas de Selección de Modalidad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Opción 1: Gratis */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsFree(true);
                      setPrice('0');
                      validateField('isFree', true);
                      validateField('price', '0');
                    }}
                    className={`p-6 rounded-3xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-4 ${
                      isFree
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                        : 'bg-[#F8F9FA] border-[#D1D5DB] hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                        <Gift className="w-3.5 h-3.5" /> Gratis
                      </span>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isFree ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isFree && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-base font-black text-[#2B2D33]">Acceso Libre y Gratuito</h4>
                      <p className="text-xs text-[#636870] mt-1 leading-relaxed">
                        Cualquier estudiante registrado puede inscribirse inmediatamente sin requerir pago ni comprobante.
                      </p>
                    </div>
                    <div className="text-2xl font-black text-emerald-700">0 BOB</div>
                  </button>

                  {/* Opción 2: De Pago */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsFree(false);
                      const currentVal = Number(price) > 0 ? price : '180';
                      setPrice(currentVal);
                      validateField('isFree', false);
                      validateField('price', currentVal);
                    }}
                    className={`p-6 rounded-3xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-4 ${
                      !isFree
                        ? 'bg-amber-50/70 border-[#F2412C] shadow-sm'
                        : 'bg-[#F8F9FA] border-[#D1D5DB] hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                        <CreditCard className="w-3.5 h-3.5 text-[#F2412C]" /> De Pago
                      </span>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          !isFree ? 'border-[#F2412C] bg-[#F2412C] text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {!isFree && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-base font-black text-[#2B2D33]">Inscripción de Pago</h4>
                      <p className="text-xs text-[#636870] mt-1 leading-relaxed">
                        Genera órdenes de pago en Bolivianos (BOB) con subida de comprobante y aprobación administrativa.
                      </p>
                    </div>
                    <div className="text-2xl font-black text-[#F2412C]">
                      {!isFree && Number(price) > 0 ? `${price} BOB` : '180 BOB'}
                    </div>
                  </button>
                </div>

                {/* Si es de pago: Input de Monto y Precios Rápidos */}
                {!isFree && (
                  <div className="bg-[#F8F9FA] border border-[#D1D5DB] rounded-3xl p-5 space-y-3.5 animate-fade-in">
                    <label className="text-xs font-bold text-[#2B2D33] block">
                      Monto a cobrar por matrícula (en Bolivianos - BOB) <span className="text-rose-500">*</span>
                    </label>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={price}
                          onChange={(e) => {
                            setPrice(e.target.value);
                            validateField('price', e.target.value);
                          }}
                          onBlur={() => markTouched('price')}
                          placeholder="ej. 250"
                          className={`w-full bg-white border rounded-2xl pl-4 pr-16 py-3 text-lg font-black text-[#2B2D33] focus:outline-none transition ${
                            touched.price && errors.price
                              ? 'border-rose-500 ring-2 ring-rose-500/10'
                              : 'border-[#D1D5DB] focus:border-[#F2412C]'
                          }`}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-[#F2412C] select-none">
                          BOB
                        </div>
                      </div>

                      {/* Botones de precios sugeridos */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {QUICK_PRICES.map((qp) => (
                          <button
                            key={qp}
                            type="button"
                            onClick={() => {
                              setPrice(qp);
                              validateField('price', qp);
                            }}
                            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                              price === qp
                                ? 'bg-[#2B2D33] text-white border-[#2B2D33]'
                                : 'bg-white hover:bg-slate-100 text-[#555861] border-[#D1D5DB]'
                            }`}
                          >
                            {qp} Bs.
                          </button>
                        ))}
                      </div>
                    </div>

                    {touched.price && errors.price && (
                      <p className="text-[11px] text-rose-500 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.price}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Porcentaje de Asistencia/Visualización Mínima */}
                <div className="bg-[#F8F9FA] border border-[#D1D5DB] rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#2B2D33] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#F2412C]" />
                      <span>Exigencia Mínima de Visualización para Certificar</span>
                    </label>
                    <span className="text-xs font-black text-[#2B2D33] bg-white px-3 py-1 rounded-xl border border-[#D1D5DB] shadow-xs">
                      {minWatchPercentage}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={minWatchPercentage}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMinWatchPercentage(val);
                      validateField('minWatchPercentage', val);
                    }}
                    className="w-full accent-[#F2412C] cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-[#636870]">
                    <span>50% (Flexible)</span>
                    <span className="font-bold text-[#2B2D33]">85% (Recomendado oficial)</span>
                    <span>100% (Estricto)</span>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* PASO 3: PORTADA                                          */}
            {/* ======================================================== */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-base font-black text-[#2B2D33] flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#F2412C]" />
                    Portada del Curso
                  </h3>
                  <p className="text-xs text-[#636870] mt-0.5">
                    Selecciona una imagen libre de derechos o pega el enlace HTTPS de tu diseño.
                  </p>
                </div>

                {/* Galería de Portadas Sugeridas */}
                <div>
                  <label className="text-xs font-bold text-[#2B2D33] block mb-2.5">
                    Portadas temáticas de libre uso (1 clic):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SUGGESTED_THUMBNAILS.map((sug) => {
                      const isSelected = thumbnailUrl === sug.url;
                      return (
                        <button
                          key={sug.label}
                          type="button"
                          onClick={() => {
                            setThumbnailUrl(sug.url);
                            setImgError(false);
                            validateField('thumbnailUrl', sug.url);
                          }}
                          className={`relative rounded-2xl overflow-hidden border-2 aspect-video group cursor-pointer transition ${
                            isSelected
                              ? 'border-[#F2412C] ring-4 ring-[#F2412C]/15 shadow-md'
                              : 'border-[#D1D5DB] hover:border-slate-400'
                          }`}
                        >
                          <img
                            src={sug.url}
                            alt={sug.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-2.5">
                            <span className="text-xs font-black text-white drop-shadow">
                              {sug.label}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#F2412C] text-white flex items-center justify-center shadow">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Input de URL personalizada */}
                <div>
                  <label className="text-xs font-bold text-[#2B2D33] block mb-1.5">
                    O ingresa una URL personalizada de imagen:
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={thumbnailUrl}
                      onChange={(e) => {
                        setThumbnailUrl(e.target.value);
                        setImgError(false);
                        validateField('thumbnailUrl', e.target.value);
                      }}
                      onBlur={() => markTouched('thumbnailUrl')}
                      placeholder="https://images.unsplash.com/photo-..."
                      className={`w-full bg-[#F8F9FA] border rounded-2xl pl-4 pr-10 py-3 text-xs text-[#2B2D33] placeholder-slate-400 focus:bg-white focus:outline-none transition ${
                        touched.thumbnailUrl && errors.thumbnailUrl
                          ? 'border-rose-500 ring-2 ring-rose-500/10'
                          : 'border-[#D1D5DB] focus:border-[#F2412C]'
                      }`}
                    />
                    {thumbnailUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setThumbnailUrl('');
                          setImgError(false);
                          validateField('thumbnailUrl', '');
                        }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#636870] hover:text-[#2B2D33] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {touched.thumbnailUrl && errors.thumbnailUrl && (
                    <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.thumbnailUrl}</span>
                    </p>
                  )}
                </div>

                {/* Nota de Guardado */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-950">
                    <span className="font-bold block">
                      {isEditMode ? 'Actualización en curso' : 'Estado inicial en Borrador'}
                    </span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      {isEditMode
                        ? 'Los cambios se aplicarán de inmediato al curso existente.'
                        : 'El programa se creará como borrador para que puedas organizar módulos, lecciones y materiales didácticos antes de solicitar su publicación.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── BARRA INFERIOR DE NAVEGACIÓN ── */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#2B2D33] text-xs font-bold border border-[#D1D5DB] transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#F2412C] hover:bg-[#d4321e] text-white text-xs font-black shadow-md shadow-[#F2412C]/20 transition cursor-pointer"
                >
                  <span>Siguiente Paso</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-[#F2412C] hover:bg-[#d4321e] text-white text-xs font-black shadow-lg shadow-[#F2412C]/25 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isEditMode ? 'Guardar Cambios' : 'Crear Curso'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Tarjeta de Vista Previa en Vivo (5 columnas en desktop) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <div className="bg-white border border-[#D1D5DB] rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E4E6EA]">
              <span className="text-xs font-black text-[#2B2D33] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#F2412C]" />
                Vista Previa del Catálogo
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                En tiempo real
              </span>
            </div>

            {/* Tarjeta idéntica al Catálogo */}
            <div className="bg-white border border-[#D1D5DB] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition">
              {/* Portada */}
              <div className="relative h-48 w-full bg-[#2B2D33] overflow-hidden">
                {thumbnailUrl && !imgError ? (
                  <img
                    src={thumbnailUrl}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-[#2B2D33] flex flex-col items-center justify-center p-4 text-center text-white">
                    <ImageIcon className="w-8 h-8 text-[#9EA3AC] mb-1" />
                    <span className="text-xs font-bold">
                      {imgError ? 'Error al cargar imagen' : 'Sin imagen de portada'}
                    </span>
                    <span className="text-[10px] text-[#9EA3AC]">
                      (Selecciona una en el Paso 3)
                    </span>
                  </div>
                )}

                {/* Insignia Estado */}
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#2B2D33]/90 text-amber-300 border border-amber-500/40 shadow">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    {isEditMode && initialCourse?.status === 'published' ? 'Publicado' : 'Borrador'}
                  </span>
                </div>

                {/* Precio */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-black shadow ${
                      isFree ? 'bg-emerald-600 text-white' : 'bg-[#F2412C] text-white'
                    }`}
                  >
                    {isFree ? 'GRATIS' : `${price || 0} BOB`}
                  </span>
                </div>

                {category && (
                  <div className="absolute bottom-3 left-3">
                    <span className="text-[10px] font-bold text-white bg-[#2B2D33]/90 px-2.5 py-0.5 rounded-lg border border-white/20 flex items-center gap-1 shadow-sm">
                      <Tag className="w-3 h-3 text-[#F2412C]" /> {category}
                    </span>
                  </div>
                )}
              </div>

              {/* Contenido de la Tarjeta */}
              <div className="p-5 space-y-3">
                <h4 className="text-base font-black text-[#2B2D33] line-clamp-2 leading-snug">
                  {title || 'Título de tu nuevo curso'}
                </h4>
                <p className="text-xs text-[#636870] line-clamp-2 min-h-[32px] leading-relaxed">
                  {description || 'Aquí aparecerá la descripción detallada de tu curso.'}
                </p>

                <div className="pt-3 border-t border-[#E4E6EA] flex items-center justify-between text-xs text-[#636870]">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#F2412C]" /> 0 módulos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" /> Req: {minWatchPercentage}%
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#636870] text-center pt-1">
              Esta tarjeta se actualizará en vivo a medida que completes cada campo del formulario.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
