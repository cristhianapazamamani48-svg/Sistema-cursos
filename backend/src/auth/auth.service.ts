import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and, gt } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { DRIZZLE_DB, DrizzleDb } from '../database/database.provider';
import {
  users,
  sessions,
  User,
  Session,
} from '../database/schema/users.schema';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Hashea un token para almacenar solo el hash SHA-256 en la base de datos
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Genera un token criptográficamente seguro
   */
  generateSecureToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Registro de un nuevo usuario (estudiante por defecto)
   */
  async register(dto: RegisterDto) {
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('El correo ya se encuentra registrado');
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const [newUser] = await this.db
      .insert(users)
      .values({
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role: 'estudiante',
        isActive: true,
      })
      .returning();

    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  /**
   * Autenticación de usuario y creación de sesión en BD
   */
  async login(
    dto: LoginDto,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ rawToken: string; user: Omit<User, 'passwordHash'>; csrfToken: string }> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta está desactivada');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Crear sesión
    const rawToken = this.generateSecureToken(32);
    const tokenHash = this.hashToken(rawToken);
    const csrfToken = this.generateSecureToken(16);

    const maxAgeDays = this.configService.get<number>('SESSION_MAX_AGE_DAYS', 30);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + maxAgeDays);

    await this.db.insert(sessions).values({
      userId: user.id,
      tokenHash,
      csrfToken,
      ip: meta.ip,
      userAgent: meta.userAgent,
      expiresAt,
    });

    const { passwordHash: _, ...safeUser } = user;
    return { rawToken, user: safeUser, csrfToken };
  }

  /**
   * Valida un token raw contra la base de datos y actualiza last_seen_at
   */
  async validateSession(
    rawToken: string,
  ): Promise<{ user: Omit<User, 'passwordHash'>; session: Session } | null> {
    const tokenHash = this.hashToken(rawToken);
    const now = new Date();

    const rows = await this.db
      .select({
        session: sessions,
        user: users,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const { session, user } = rows[0];

    // Actualizar last_seen_at (asíncrono, fire and forget o con await rápido)
    await this.db
      .update(sessions)
      .set({ lastSeenAt: now })
      .where(eq(sessions.id, session.id));

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, session };
  }

  /**
   * Cierra sesión borrando la sesión en la base de datos
   */
  async logout(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  /**
   * Obtiene los datos del usuario por ID
   */
  async getUserById(id: number) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}
