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
import { LessonsService } from './lessons.service';
import {
  CreateLessonDto,
  createLessonSchema,
  UpdateLessonDto,
  updateLessonSchema,
  CreateVideoDto,
  createVideoSchema,
  ReviewVideoDto,
  reviewVideoSchema,
  CreateResourceDto,
  createResourceSchema,
} from './dto/lesson.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/schema/users.schema';

@Controller()
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get('videos')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('docente', 'admin', 'superadmin')
  async findAllVideos() {
    return this.lessonsService.findAllVideos();
  }

  @Post('videos')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('docente', 'admin', 'superadmin')
  async uploadVideo(@Body() body: unknown, @CurrentUser() user: User) {
    const parseResult = createVideoSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de video inválidos',
        errors: parseResult.error.format(),
      });
    }
    return this.lessonsService.createVideo(parseResult.data, user.id);
  }

  @Patch('videos/:id/review')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async reviewVideo(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @CurrentUser() user: User,
  ) {
    const parseResult = reviewVideoSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de revisión inválidos',
        errors: parseResult.error.format(),
      });
    }
    return this.lessonsService.reviewVideo(id, parseResult.data, user.id);
  }

  // 2. LECCIONES
  @Get('lessons/:id')
  @UseGuards(SessionGuard)
  async getLesson(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.lessonsService.getLesson(id, user);
  }

  @Post('lessons')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'docente')
  async createLesson(@Body() body: unknown) {
    const parseResult = createLessonSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de lección inválidos',
        errors: parseResult.error.format(),
      });
    }
    return this.lessonsService.createLesson(parseResult.data);
  }

  @Patch('lessons/:id')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'docente')
  async updateLesson(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parseResult = updateLessonSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de actualización inválidos',
        errors: parseResult.error.format(),
      });
    }
    return this.lessonsService.updateLesson(id, parseResult.data);
  }

  // 3. RECURSOS
  @Post('lessons/:id/resources')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin', 'docente')
  async addResource(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parseResult = createResourceSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de recurso inválidos',
        errors: parseResult.error.format(),
      });
    }
    return this.lessonsService.addResource(id, parseResult.data);
  }
}
