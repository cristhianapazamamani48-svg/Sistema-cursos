import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq, count, and } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDb } from '../database/database.provider';
import { users } from '../database/schema/users.schema';
import { enrollments } from '../database/schema/enrollments.schema';
import { certificates } from '../database/schema/certificates.schema';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  /* ------------------------------------------------------------------ */
  /*  GET /api/users/me                                                   */
  /* ------------------------------------------------------------------ */
  async getMe(userId: number) {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        phone: users.phone,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const [enrollmentStats] = await this.db
      .select({ total: count() })
      .from(enrollments)
      .where(eq(enrollments.userId, userId));

    const [completedCount] = await this.db
      .select({ total: count() })
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.status, 'completed')));

    const [certCount] = await this.db
      .select({ total: count() })
      .from(certificates)
      .where(eq(certificates.userId, userId));

    return {
      ...user,
      stats: {
        enrollments: enrollmentStats?.total ?? 0,
        completedCourses: completedCount?.total ?? 0,
        certificates: certCount?.total ?? 0,
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  PATCH /api/users/me/profile                                         */
  /* ------------------------------------------------------------------ */
  async updateProfile(
    userId: number,
    dto: { fullName?: string; bio?: string; phone?: string; avatarUrl?: string },
  ) {
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const updateData: Partial<typeof users.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName.trim();
    if (dto.bio !== undefined) updateData.bio = dto.bio;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;

    await this.db.update(users).set(updateData).where(eq(users.id, userId));

    return this.getMe(userId);
  }

  /* ------------------------------------------------------------------ */
  /*  PATCH /api/users/me/password                                        */
  /* ------------------------------------------------------------------ */
  async updatePassword(
    userId: number,
    dto: { currentPassword: string; newPassword: string; confirmPassword: string },
  ) {
    if (!dto.currentPassword || !dto.newPassword || !dto.confirmPassword) {
      throw new BadRequestException('Todos los campos son obligatorios');
    }
    if (dto.newPassword.length < 8) {
      throw new BadRequestException('La nueva contraseña debe tener al menos 8 caracteres');
    }
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const [user] = await this.db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');

    const newHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return { message: 'Contraseña actualizada correctamente' };
  }
}
