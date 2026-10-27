import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const cookieName = this.configService.get<string>('SESSION_COOKIE_NAME', 'sid');
    const rawToken = request.cookies?.[cookieName];

    if (!rawToken) {
      throw new UnauthorizedException('No se proporcionó una sesión activa');
    }

    const sessionData = await this.authService.validateSession(rawToken);
    if (!sessionData) {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }

    if (!sessionData.user.isActive) {
      throw new ForbiddenException('La cuenta de usuario está desactivada');
    }

    // Adjuntar usuario y sesión al request
    (request as any).user = sessionData.user;
    (request as any).session = sessionData.session;

    // Validación de token CSRF para peticiones que mutan estado
    const method = request.method.toUpperCase();
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (mutatingMethods.includes(method)) {
      const publicAuthRoutes = ['/api/auth/login', '/api/auth/register'];
      const path = request.originalUrl || request.url;
      if (!publicAuthRoutes.some((route) => path.startsWith(route))) {
        const clientToken =
          request.headers['x-csrf-token'] ||
          request.headers['csrf-token'] ||
          (request.body as any)?._csrf;

        if (!clientToken || clientToken !== sessionData.session.csrfToken) {
          throw new ForbiddenException('Token CSRF inválido o ausente');
        }
      }
    }

    return true;
  }
}
