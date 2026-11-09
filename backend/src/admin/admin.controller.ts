import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
}

