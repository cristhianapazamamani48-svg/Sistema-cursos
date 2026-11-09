import { z } from 'zod';

// Esquema Paso 1: Información
export const courseInfoSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es requerido')
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(120, 'El título no puede exceder 120 caracteres')
    .trim(),
  slug: z
    .string()
    .min(1, 'El slug es requerido')
    .min(3, 'El slug debe tener al menos 3 caracteres')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'El slug solo puede contener letras minúsculas, números y guiones (ej. curso-react)'
    )
    .trim(),
  description: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
});

// Esquema Paso 2: Precio (Gratis o de pago en BOB)
export const coursePriceSchema = z
  .object({
    isFree: z.boolean(),
    price: z.coerce
      .number({ invalid_type_error: 'Ingresa un número válido' })
      .min(0, 'El precio no puede ser negativo'),
    currency: z.literal('BOB'),
    minWatchPercentage: z.coerce
      .number({ invalid_type_error: 'Ingresa un porcentaje válido' })
      .min(1, 'El porcentaje mínimo es 1%')
      .max(100, 'El porcentaje máximo es 100%')
      .default(85),
  })
  .refine(
    (data) => {
      if (!data.isFree && Number(data.price) <= 0) {
        return false;
      }
      return true;
    },
    {
      message: 'Si el curso es de pago, el precio en BOB debe ser mayor a 0',
      path: ['price'],
    }
  );

// Esquema Paso 3: Portada
export const courseThumbnailSchema = z.object({
  thumbnailUrl: z
    .string()
    .trim()
    .url('Debe ser una URL válida (ej. https://images.unsplash.com/...)')
    .optional()
    .or(z.literal('')),
});

// Esquema completo para el envío final a la API
export const fullCourseFormSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').trim(),
  slug: z.string().min(3, 'El slug debe tener al menos 3 caracteres').trim(),
  description: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
  thumbnailUrl: z.string().url('URL de portada inválida').optional().or(z.literal('')),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  currency: z.literal('BOB').default('BOB'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  minWatchPercentage: z.coerce.number().min(1).max(100).default(85),
});

export type CourseInfoForm = z.infer<typeof courseInfoSchema>;
export type CoursePriceForm = z.infer<typeof coursePriceSchema>;
export type CourseThumbnailForm = z.infer<typeof courseThumbnailSchema>;
export type FullCoursePayload = z.infer<typeof fullCourseFormSchema>;

export const POPULAR_CATEGORIES = [
  'Tecnología y Software',
  'Negocios y Finanzas',
  'Auditoría y Contabilidad',
  'Marketing Digital',
  'Diseño y Multimedia',
  'Habilidades Blandas',
  'Leyes y Regulación',
  'Salud y Seguridad',
  'Educación y Docencia',
] as const;
