import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // La validación CSRF para peticiones autenticadas se realiza en SessionGuard
    // una vez que la sesión ha sido validada y cargada en el request.
    next();
  }
}
