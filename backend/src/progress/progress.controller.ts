import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ProgressService } from './progress.service';
import { HeartbeatDto, heartbeatSchema } from './dto/progress.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/schema/users.schema';

@Controller('progress')
@UseGuards(SessionGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('lessons/:lessonId')
  async getOrCreateProgress(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @CurrentUser() user: User,
  ) {
    return this.progressService.getOrCreateProgress(user.id, lessonId);
  }

  @Post('heartbeat')
  async sendHeartbeat(@Body() body: unknown, @CurrentUser() user: User) {
    const parseResult = heartbeatSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de heartbeat inválidos',
        errors: parseResult.error.format(),
      });
    }

    return this.progressService.handleHeartbeat(parseResult.data, user.id);
  }
}
