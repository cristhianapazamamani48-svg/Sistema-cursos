import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import {
  CreateCourseDto,
  createCourseSchema,
  UpdateCourseDto,
  updateCourseSchema,
  AssignDocenteDto,
  assignDocenteSchema,
  CreateModuleDto,
  createModuleSchema,
  updateModuleSchema,
  reorderModulesSchema,
} from './dto/course.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/schema/users.schema';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  async findAll() {
    return this.coursesService.findAll(true);
  }

  @Get('admin/all')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async findAllAdmin() {
    return this.coursesService.findAll(false);
  }

  @Get('my/enrolled')
  @UseGuards(SessionGuard)
  async findMyEnrolled(@CurrentUser() user: User) {
    return this.coursesService.findMyEnrolledCourses(user.id);
  }

  @Get('teacher/my-courses')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'docente')
  async findTeacherCourses(@CurrentUser() user: User) {
    return this.coursesService.findTeacherCourses(user);
  }

  @Get('preview/:slug')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'docente')
  async previewCourse(@Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug, true);
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug);
  }

  @Get(':slug/classroom')
  @UseGuards(SessionGuard)
  async getClassroom(@Param('slug') slug: string, @CurrentUser() user: User) {
    return this.coursesService.getClassroom(slug, user.id);
  }

  @Post()
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'docente')
  async create(@Body() body: unknown, @CurrentUser() user: User) {
    const parseResult = createCourseSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de curso inválidos',
        errors: parseResult.error.format(),
      });
    }
    return this.coursesService.create(parseResult.data, user.id, user.role);
  }

  @Patch(':id')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'docente')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @CurrentUser() user: User,
  ) {
    const parseResult = updateCourseSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de actualización inválidos',
        errors: parseResult.error.format(),
      });
    }
    return this.coursesService.update(id, parseResult.data, user);
  }

  @Post(':id/docentes')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async assignDocente(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parseResult = assignDocenteSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de docente inválidos',
        errors: parseResult.error.format(),
      });
    }
    return this.coursesService.assignDocente(id, parseResult.data);
  }

  @Post(':id/modules')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'docente')
  async createModule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parseResult = createModuleSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de módulo inválidos',
        errors: parseResult.error.format(),
      });
    }
    return this.coursesService.createModule(id, parseResult.data);
  }

  @Get(':id/curriculum')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'docente')
  async getCourseCurriculum(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.getCourseCurriculum(id);
  }

  @Patch('modules/:moduleId')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'docente')
  async updateModule(
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @Body() body: unknown,
  ) {
    const parseResult = updateModuleSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de módulo inválidos',
        errors: parseResult.error.format(),
      });
    }
    return this.coursesService.updateModule(moduleId, parseResult.data);
  }

  @Delete('modules/:moduleId')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'docente')
  async deleteModule(@Param('moduleId', ParseIntPipe) moduleId: number) {
    return this.coursesService.deleteModule(moduleId);
  }

  @Post(':id/modules/reorder')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'docente')
  async reorderModules(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parseResult = reorderModulesSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Lista de IDs de módulos inválida',
        errors: parseResult.error.format(),
      });
    }
    return this.coursesService.reorderModules(id, parseResult.data.moduleIds);
  }
}
