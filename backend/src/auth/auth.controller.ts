import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, registerSchema, LoginDto, loginSchema } from './dto/auth.dto';
import { SessionGuard } from './guards/session.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../database/schema/users.schema';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de registro inválidos',
        errors: parseResult.error.format(),
      });
    }

    const user = await this.authService.register(parseResult.data);
    return {
      message: 'Usuario registrado exitosamente',
      user,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de inicio de sesión inválidos',
        errors: parseResult.error.format(),
      });
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip;
    const userAgent = req.headers['user-agent'];

    const { rawToken, user, csrfToken } = await this.authService.login(parseResult.data, {
      ip,
      userAgent,
    });

    const cookieName = this.configService.get<string>('SESSION_COOKIE_NAME', 'sid');
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const maxAgeDays = this.configService.get<number>('SESSION_MAX_AGE_DAYS', 30);

    // Set HttpOnly cookie
    res.cookie(cookieName, rawToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      message: 'Inicio de sesión exitoso',
      user,
      csrfToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieName = this.configService.get<string>('SESSION_COOKIE_NAME', 'sid');
    const rawToken = req.cookies?.[cookieName];

    if (rawToken) {
      await this.authService.logout(rawToken);
    }

    res.clearCookie(cookieName, {
      path: '/',
    });

    return {
      message: 'Sesión finalizada exitosamente',
    };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async getProfile(@CurrentUser() user: Omit<User, 'passwordHash'>, @Req() req: any) {
    return {
      user,
      csrfToken: req.session?.csrfToken,
    };
  }
}
