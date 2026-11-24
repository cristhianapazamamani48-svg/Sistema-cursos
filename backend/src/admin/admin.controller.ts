import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/schema/users.schema';
import {
  createAdminUserSchema,
  updateRoleSchema,
  updateStatusSchema,
} from './dto/admin-user.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('summary')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async getSummary() {
    return this.adminService.getSummary();
  }

  @Get('students')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async getEnrolledStudents() {
    return this.adminService.getEnrolledStudents();
  }

  @Get('users')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Post('users')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async createUser(@Body() body: unknown, @CurrentUser() admin: User) {
    const parseResult = createAdminUserSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de usuario inválidos',
        errors: parseResult.error.format(),
      });
    }
    return this.adminService.createUser(parseResult.data, admin.id);
  }

  @Patch('users/:id/role')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @CurrentUser() admin: User,
  ) {
    const parseResult = updateRoleSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Rol inválido',
        errors: parseResult.error.format(),
      });
    }
    return this.adminService.updateUserRole(id, parseResult.data.role, admin.id);
  }

  @Patch('users/:id/status')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async toggleUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @CurrentUser() admin: User,
  ) {
    const parseResult = updateStatusSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Estado inválido',
        errors: parseResult.error.format(),
      });
    }
    return this.adminService.toggleUserStatus(id, parseResult.data.isActive, admin.id);
  }
}
