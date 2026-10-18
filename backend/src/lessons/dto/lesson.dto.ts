import { z } from 'zod';
import { videoProviderValues } from '../../database/schema/videos.schema';
import { lessonStatusValues, resourceTypeValues } from '../../database/schema/lessons.schema';

export const createVideoSchema = z.object({
  title: z.string().min(2, 'El título del video es requerido').trim(),
  provider: z.enum(videoProviderValues),
  providerRef: z.string().min(1, 'La referencia del proveedor es requerida').trim(),
  durationSeconds: z.coerce.number().int().positive('La duración debe ser mayor a 0 segundos'),
});
export type CreateVideoDto = z.infer<typeof createVideoSchema>;

export const reviewVideoSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().optional(),
}).refine(
  (data) => (data.status !== 'rejected' || !!data.rejectionReason),
  { message: 'El motivo de rechazo es obligatorio si el video es rechazado', path: ['rejectionReason'] }
);
export type ReviewVideoDto = z.infer<typeof reviewVideoSchema>;

export const createLessonSchema = z.object({
  moduleId: z.coerce.number().positive(),
  videoId: z.coerce.number().positive().optional(),
  title: z.string().min(2, 'El título de la lección es requerido').trim(),
  description: z.string().optional(),
  orderIndex: z.coerce.number().int().min(0),
  status: z.enum(lessonStatusValues).default('draft'),
});
export type CreateLessonDto = z.infer<typeof createLessonSchema>;

export const updateLessonSchema = createLessonSchema.partial();
export type UpdateLessonDto = z.infer<typeof updateLessonSchema>;

export const createResourceSchema = z.object({
  title: z.string().min(2, 'El título del recurso es requerido').trim(),
  type: z.enum(resourceTypeValues),
  url: z.string().url('URL inválida').trim(),
  orderIndex: z.coerce.number().int().min(0).default(0),
});
export type CreateResourceDto = z.infer<typeof createResourceSchema>;
