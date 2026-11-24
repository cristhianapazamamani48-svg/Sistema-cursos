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

@Controller('users')
@UseGuards(SessionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Request() req: any) {
    return this.usersService.getMe(req.user.id);
  }

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    return this.usersService.getDashboardSummary(req.user);
  }

  @Patch('me/profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  async updatePassword(@Request() req: any, @Body() dto: UpdatePasswordDto) {
    return this.usersService.updatePassword(req.user.id, dto);
  }
}
