import { z } from 'zod';
import { transactionProviderValues } from '../../database/schema/orders.schema';

export const createOrderSchema = z.object({
  courseId: z.coerce.number().positive('ID de curso inválido'),
});
export type CreateOrderDto = z.infer<typeof createOrderSchema>;

export const confirmManualPaymentSchema = z.object({
  receiptUrl: z.string().url('URL del comprobante inválida').optional().or(z.literal('')),
  notes: z.string().optional(),
});
export type ConfirmManualPaymentDto = z.infer<typeof confirmManualPaymentSchema>;

export const webhookPaymentSchema = z.object({
  orderId: z.coerce.number().positive(),
  provider: z.enum(transactionProviderValues),
  providerReference: z.string().min(1, 'Referencia del proveedor requerida'),
  status: z.enum(['completed', 'failed']),
  rawResponse: z.record(z.any()).optional(),
});
export type WebhookPaymentDto = z.infer<typeof webhookPaymentSchema>;

export const adminEnrollSchema = z.object({
  userId: z.coerce.number().positive(),
  courseId: z.coerce.number().positive(),
});
export type AdminEnrollDto = z.infer<typeof adminEnrollSchema>;
