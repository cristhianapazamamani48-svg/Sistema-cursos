import {
  Controller,
  Get,
  Patch,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SessionGuard } from '../auth/guards/session.guard';

export class UpdateProfileDto {
  fullName?: string;
  bio?: string;
  phone?: string;
  avatarUrl?: string;
}

export class UpdatePasswordDto {
  currentPassword!: string;
  newPassword!: string;
  confirmPassword!: string;
}

@Controller('api/users')
@UseGuards(SessionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Request() req: any) {
    return this.usersService.getMe(req.user.userId);
  }

  @Patch('me/profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  async updatePassword(@Request() req: any, @Body() dto: UpdatePasswordDto) {
    return this.usersService.updatePassword(req.user.userId, dto);
  }
}
