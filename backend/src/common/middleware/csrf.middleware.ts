import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Métodos de lectura no modifican estado
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    // Rutas públicas de autenticación que no requieren CSRF token previo
    const publicAuthRoutes = ['/api/auth/login', '/api/auth/register'];
    const path = req.baseUrl || req.originalUrl || req.url;
    if (publicAuthRoutes.some((route) => path.startsWith(route))) {
      return next();
    }

    // Para peticiones autenticadas de mutación (POST, PUT, PATCH, DELETE)
    // Se valida el token provisto en el header x-csrf-token contra la sesión
    const session = (req as any).session;
    if (session && session.csrfToken) {
      const clientToken =
        req.headers['x-csrf-token'] || req.headers['csrf-token'] || req.body?._csrf;

      if (!clientToken || clientToken !== session.csrfToken) {
        throw new ForbiddenException('Token CSRF inválido o ausente');
      }
    }

    next();
  }
}
