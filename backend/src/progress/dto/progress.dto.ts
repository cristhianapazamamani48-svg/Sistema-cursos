import { z } from 'zod';

export const heartbeatSchema = z.object({
  progressId: z.coerce.number().positive('ID de progreso inválido'),
  blockIndex: z.coerce.number().int().min(0, 'Índice de bloque inválido'),
  currentPositionSeconds: z.coerce.number().int().min(0, 'Posición inválida'),
});

export type HeartbeatDto = z.infer<typeof heartbeatSchema>;
