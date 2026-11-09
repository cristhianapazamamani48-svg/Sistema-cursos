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
  Globe,
  Tag,
  Clock,
  Layers,
  Info,
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
  isOpen: boolean;
  onClose: () => void;
  initialCourse?: ManagedCourse | null;
  onSuccess: () => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export default function CourseFormWizard({
  isOpen,
  onClose,
  initialCourse,
  onSuccess,
  showToast,
}: CourseFormWizardProps) {
  const isEditMode = Boolean(initialCourse);

  // Paso actual (1: Info, 2: Precio, 3: Portada)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

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

  // Errores de validación en vivo (mapeados por campo)
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
      // Valores por defecto para nuevo curso
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
    setCurrentStep(1);
    setImgError(false);
  }, [initialCourse, isOpen]);

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

  // Manejador de cambio en título con autogeneración de slug
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

  // Validación en vivo con Zod por campo individual
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

  // Validar paso 1 completo antes de avanzar
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

  // Validar paso 2 completo antes de avanzar
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

  // Validar paso 3 completo
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

  // Avanzar de paso
  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  // Guardar curso (Nuevo como Borrador, o Actualizar existente)
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

    // Validación global con Zod antes del envío
    const validation = fullCourseFormSchema.safeParse(payload);
    if (!validation.success) {
      showToast('error', validation.error.errors[0]?.message || 'Datos del curso inválidos');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && initialCourse) {
        // Actualizar curso existente
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
        // Crear nuevo curso (siempre en borrador por defecto)
        const res = await api('/api/courses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Error al crear curso');
        }

        showToast('success', `¡Curso "${data.title}" guardado como borrador!`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('error', err.message || 'Ocurrió un error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-6 animate-fade-in flex flex-col max-h-[92vh]">
        {/* CABECERA DEL WIZARD */}
        <div className="p-6 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                {isEditMode ? `Editar Curso: ${initialCourse?.title}` : 'Crear Nuevo Curso'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditMode
                  ? 'Modifica los parámetros en 3 pasos ordenados'
                  : 'Completa la información en 3 pasos (se guardará como borrador)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* INDICADOR DE LOS 3 PASOS */}
        <div className="px-6 py-3.5 bg-slate-900/90 border-b border-slate-800/80">
          <div className="grid grid-cols-3 gap-2">
            {/* Paso 1 */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 p-2 rounded-xl text-left transition cursor-pointer ${
                currentStep === 1
                  ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300'
                  : currentStep > 1
                  ? 'text-emerald-400 hover:bg-slate-800/60'
                  : 'text-slate-500 hover:bg-slate-800/40'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                  currentStep === 1
                    ? 'bg-blue-600 text-white'
                    : currentStep > 1
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-bold block leading-none">Información</span>
                <span className="text-[10px] text-slate-400">Título y categoría</span>
              </div>
            </button>

            {/* Paso 2 */}
            <button
              type="button"
              onClick={() => {
                if (validateStep1()) setCurrentStep(2);
              }}
              className={`flex items-center gap-2 p-2 rounded-xl text-left transition cursor-pointer ${
                currentStep === 2
                  ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300'
                  : currentStep > 2
                  ? 'text-emerald-400 hover:bg-slate-800/60'
                  : 'text-slate-500 hover:bg-slate-800/40'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                  currentStep === 2
                    ? 'bg-blue-600 text-white'
                    : currentStep > 2
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-bold block leading-none">Precio</span>
                <span className="text-[10px] text-slate-400">Gratis o BOB</span>
              </div>
            </button>

            {/* Paso 3 */}
            <button
              type="button"
              onClick={() => {
                if (validateStep1() && validateStep2()) setCurrentStep(3);
              }}
              className={`flex items-center gap-2 p-2 rounded-xl text-left transition cursor-pointer ${
                currentStep === 3
                  ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300'
                  : 'text-slate-500 hover:bg-slate-800/40'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                  currentStep === 3
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                3
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-bold block leading-none">Portada</span>
                <span className="text-[10px] text-slate-400">URL e imagen</span>
              </div>
            </button>
          </div>
        </div>

        {/* CUERPO DEL PASO (SCROLLABLE) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ======================================================== */}
          {/* PASO 1: INFORMACIÓN                                     */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              {/* Título */}
              <div>
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between mb-1">
                  <span>Título del Curso *</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {title.length}/120
                  </span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={() => markTouched('title')}
                  placeholder="ej. Auditoría Financiera y Contabilidad Gubernamental"
                  className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition ${
                    touched.title && errors.title
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-700 focus:border-blue-500'
                  }`}
                />
                {touched.title && errors.title && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.title}</span>
                  </p>
                )}
              </div>

              {/* Slug Automático Editable */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    Slug / Enlace permanente *
                  </label>
                  <label className="text-[11px] text-slate-400 flex items-center gap-1.5 cursor-pointer">
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
                      className="rounded accent-blue-600 cursor-pointer"
                    />
                    Autogenerar desde título
                  </label>
                </div>
                <div
                  className={`flex items-center bg-slate-950 border rounded-xl px-3 py-2 text-xs font-mono transition ${
                    touched.slug && errors.slug
                      ? 'border-rose-500'
                      : 'border-slate-700 focus-within:border-blue-500'
                  }`}
                >
                  <span className="text-slate-500 select-none">/courses/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    onBlur={() => markTouched('slug')}
                    placeholder="auditoria-financiera-gubernamental"
                    className="w-full bg-transparent text-white focus:outline-none ml-1"
                  />
                </div>
                {touched.slug && errors.slug ? (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.slug}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Dirección web única por la cual accederán los estudiantes.
                  </p>
                )}
              </div>

              {/* Categoría */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Categoría o Área Temática
                </label>
                <div className="space-y-2">
                  <select
                    value={POPULAR_CATEGORIES.includes(category as any) ? category : category ? 'other' : ''}
                    onChange={(e) => {
                      if (e.target.value === 'other') {
                        setCategory('');
                      } else {
                        setCategory(e.target.value);
                      }
                      validateField('category', e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Selecciona una categoría sugerida --</option>
                    {POPULAR_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="other">Personalizada / Otra categoría...</option>
                  </select>

                  {(!POPULAR_CATEGORIES.includes(category as any) || category === '') && (
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        validateField('category', e.target.value);
                      }}
                      placeholder="Escribe el nombre de tu categoría personalizada..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Descripción del Curso
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    validateField('description', e.target.value);
                  }}
                  placeholder="Detalla los objetivos de aprendizaje, temarios y a quién va dirigido este curso..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PASO 2: PRECIO (GRATIS O DE PAGO EN BOB)                 */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Modalidad de Inscripción</h3>
                <p className="text-xs text-slate-400">
                  Define si el curso será de acceso libre o requerirá pago en moneda nacional (BOB).
                </p>
              </div>

              {/* Opciones de Modalidad (Gratis vs Pago) */}
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
                  className={`p-5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between space-y-3 ${
                    isFree
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                      Gratis
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isFree ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'
                      }`}
                    >
                      {isFree && <CheckCircle2 className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Acceso Gratuito</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cualquier estudiante registrado puede inscribirse inmediatamente sin costo.
                    </p>
                  </div>
                  <div className="text-lg font-black text-emerald-400">0 BOB</div>
                </button>

                {/* Opción 2: De Pago */}
                <button
                  type="button"
                  onClick={() => {
                    setIsFree(false);
                    const currentVal = Number(price) > 0 ? price : '150';
                    setPrice(currentVal);
                    validateField('isFree', false);
                    validateField('price', currentVal);
                  }}
                  className={`p-5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between space-y-3 ${
                    !isFree
                      ? 'bg-blue-950/40 border-blue-500/60 shadow-lg shadow-blue-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/40 uppercase">
                      De Pago
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        !isFree ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                      }`}
                    >
                      {!isFree && <CheckCircle2 className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Venta Institucional</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Genera órdenes de pago en Bolivianos con confirmación de comprobante.
                    </p>
                  </div>
                  <div className="text-lg font-black text-blue-400">
                    {!isFree && Number(price) > 0 ? `${price} BOB` : 'Fijar monto'}
                  </div>
                </button>
              </div>

              {/* Input de Precio en BOB (si es de pago) */}
              {!isFree && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2 animate-fade-in">
                  <label className="text-xs font-bold text-slate-300 block">
                    Monto a cobrar (en Bolivianos - BOB) *
                  </label>
                  <div className="relative">
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
                      placeholder="ej. 350"
                      className={`w-full bg-slate-900 border rounded-xl pl-4 pr-16 py-2.5 text-sm font-bold text-white focus:outline-none transition ${
                        touched.price && errors.price
                          ? 'border-rose-500 focus:border-rose-500'
                          : 'border-slate-700 focus:border-blue-500'
                      }`}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-blue-400 select-none">
                      BOB
                    </div>
                  </div>
                  {touched.price && errors.price && (
                    <p className="text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.price}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Parámetro Académico: Aprobación Mínima (%) */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>Requisito Mínimo de Visualización (%)</span>
                  </label>
                  <span className="text-xs font-extrabold text-white bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
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
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Porcentaje del contenido en video que el estudiante debe visualizar para aprobar y certificar (estándar: 85%).
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PASO 3: PORTADA CON VISTA PREVIA EN VIVO                */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Portada del Curso</h3>
                <p className="text-xs text-slate-400">
                  Ingresa una URL directa de imagen para la portada y comprueba la vista previa en vivo.
                </p>
              </div>

              {/* Input URL de Imagen */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  URL de la Imagen (HTTPS)
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
                    className={`w-full bg-slate-950 border rounded-xl pl-4 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition ${
                      touched.thumbnailUrl && errors.thumbnailUrl
                        ? 'border-rose-500'
                        : 'border-slate-700 focus:border-blue-500'
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {touched.thumbnailUrl && errors.thumbnailUrl && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.thumbnailUrl}</span>
                  </p>
                )}

                {/* Sugerencias de imágenes de prueba */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-slate-500">Imágenes sugeridas:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const url =
                        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop';
                      setThumbnailUrl(url);
                      setImgError(false);
                      validateField('thumbnailUrl', url);
                    }}
                    className="text-[11px] text-blue-400 hover:underline"
                  >
                    Finanzas
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const url =
                        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop';
                      setThumbnailUrl(url);
                      setImgError(false);
                      validateField('thumbnailUrl', url);
                    }}
                    className="text-[11px] text-blue-400 hover:underline"
                  >
                    Tecnología
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const url =
                        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop';
                      setThumbnailUrl(url);
                      setImgError(false);
                      validateField('thumbnailUrl', url);
                    }}
                    className="text-[11px] text-blue-400 hover:underline"
                  >
                    Auditoría
                  </button>
                </div>
              </div>

              {/* VISTA PREVIA EN VIVO DE LA TARJETA */}
              <div>
                <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-2">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Vista Previa de la Tarjeta del Curso:</span>
                </label>

                <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden max-w-sm mx-auto shadow-xl group">
                  {/* Contenedor de la portada */}
                  <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                    {thumbnailUrl && !imgError ? (
                      <img
                        src={thumbnailUrl}
                        alt="Vista previa de portada"
                        className="w-full h-full object-cover transition duration-300"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4 text-center">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-1.5">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400">
                          {imgError ? 'Error al cargar imagen' : 'Sin imagen de portada'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          (Se usará un fondo degradado institucional)
                        </span>
                      </div>
                    )}

                    {/* Badge de Borrador */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-950/90 text-amber-300 border border-amber-500/40 shadow-lg">
                        <Lock className="w-2.5 h-2.5 text-amber-400" />
                        {isEditMode && initialCourse?.status === 'published'
                          ? 'Publicado'
                          : 'Borrador'}
                      </span>
                    </div>

                    {/* Badge de Precio */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className="px-2.5 py-0.5 rounded-xl text-[10px] font-black bg-slate-950/90 text-white border border-slate-700 shadow-lg">
                        {isFree ? 'GRATIS' : `${price || 0} BOB`}
                      </span>
                    </div>

                    {category && (
                      <div className="absolute bottom-2.5 left-2.5">
                        <span className="text-[10px] font-bold text-blue-300 bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-blue-400" /> {category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cuerpo de la tarjeta previa */}
                  <div className="p-4 space-y-2">
                    <h4 className="text-sm font-bold text-white line-clamp-1">
                      {title || 'Título de tu nuevo curso'}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 min-h-[30px]">
                      {description || 'Sin descripción redactada aún.'}
                    </p>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-blue-400" /> 0 módulos
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" /> Req: {minWatchPercentage}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aviso de Guardado */}
              <div className="p-3.5 bg-blue-950/40 border border-blue-500/30 rounded-2xl flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <span className="font-bold text-white block">
                    {isEditMode ? 'Actualización de Curso' : 'Guardado como Borrador'}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isEditMode
                      ? 'Los cambios se aplicarán de inmediato a tu curso existente.'
                      : 'El curso se guardará inicialmente en estado Borrador para que puedas organizar módulos y lecciones con total tranquilidad antes de publicarlo.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PIE DE PÁGINA CON BOTONES DE NAVEGACIÓN Y GUARDADO */}
        <div className="p-4 sm:p-6 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-3">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition hover:scale-[1.02] cursor-pointer"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xl shadow-blue-600/30 transition hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isEditMode ? 'Guardar Cambios' : 'Guardar como Borrador'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
