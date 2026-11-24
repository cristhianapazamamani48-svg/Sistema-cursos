import { z } from 'zod';
import { roleEnumValues } from '../../database/schema/users.schema';

export const createAdminUserSchema = z.object({
  email: z.string().email('Correo electrónico inválido').trim().toLowerCase(),
  fullName: z.string().min(2, 'El nombre completo es requerido').trim(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(roleEnumValues).default('docente'),
});
export type CreateAdminUserDto = z.infer<typeof createAdminUserSchema>;

export const updateRoleSchema = z.object({
  role: z.enum(roleEnumValues),
});
export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;

export const updateStatusSchema = z.object({
  isActive: z.boolean(),
});
export type UpdateStatusDto = z.infer<typeof updateStatusSchema>;
