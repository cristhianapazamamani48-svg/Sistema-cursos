import { z } from 'zod';
import { courseStatusValues, currencyValues } from '../../database/schema/courses.schema';

export const createCourseSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').trim(),
  slug: z.string().min(3, 'El slug debe tener al menos 3 caracteres').toLowerCase().trim(),
  description: z.string().optional(),
  thumbnailUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo').default(0),
  currency: z.enum(currencyValues).default('BOB'),
  status: z.enum(courseStatusValues).default('draft'),
  minWatchPercentage: z.coerce.number().min(1).max(100).default(85),
});

export type CreateCourseDto = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = createCourseSchema.partial();
export type UpdateCourseDto = z.infer<typeof updateCourseSchema>;

export const assignDocenteSchema = z.object({
  userId: z.coerce.number().positive(),
});
export type AssignDocenteDto = z.infer<typeof assignDocenteSchema>;

export const createModuleSchema = z.object({
  title: z.string().min(2, 'El título del módulo es requerido').trim(),
  description: z.string().optional(),
  orderIndex: z.coerce.number().int().min(0),
});
export type CreateModuleDto = z.infer<typeof createModuleSchema>;
