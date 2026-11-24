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
} from '@nestjs/common';
import { UnitsService } from './units.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/schema/users.schema';

@Controller('units')
@UseGuards(SessionGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  // =========================================================================
  // 1. MATERIAL DE ESTUDIO Y COMPLEMENTARIO
  // =========================================================================

  @Patch(':id/study-material')
  async updateStudyMaterial(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { studyMaterialUrl?: string; studyMaterialContent?: string },
    @CurrentUser() user: User,
  ) {
    return this.unitsService.updateStudyMaterial(id, body, user);
  }

  @Get(':id/resources')
  async getResources(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.unitsService.getUnitResources(id, user);
  }

  @Post(':id/resources')
  async addResource(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      title: string;
      type: 'pdf' | 'link' | 'image' | 'other';
      url: string;
      materialCategory?: 'study' | 'complementary';
    },
    @CurrentUser() user: User,
  ) {
    return this.unitsService.addUnitResource(id, body, user);
  }

  @Delete('resources/:resourceId')
  async deleteResource(
    @Param('resourceId', ParseIntPipe) resourceId: number,
    @CurrentUser() user: User,
  ) {
    return this.unitsService.deleteUnitResource(resourceId, user);
  }

  // =========================================================================
  // 2. FORO DE LA UNIDAD
  // =========================================================================

  @Get(':id/forum')
  async getForum(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.unitsService.getUnitForum(id, user);
  }

  @Post(':id/forum/messages')
  async postForumMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { message: string; parentId?: number },
    @CurrentUser() user: User,
  ) {
    return this.unitsService.postForumMessage(id, body, user);
  }

  @Patch(':id/forum/config')
  async updateForumConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title?: string; description?: string; isClosed?: boolean },
    @CurrentUser() user: User,
  ) {
    return this.unitsService.updateForumConfig(id, body, user);
  }

  // =========================================================================
  // 3. ACTIVIDADES PRÁCTICAS
  // =========================================================================

  @Get(':id/activities')
  async getActivities(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.unitsService.getUnitActivities(id, user);
  }

  @Post(':id/activities')
  async createActivity(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      title: string;
      description?: string;
      instructions?: string;
      dueDate?: string;
    },
    @CurrentUser() user: User,
  ) {
    return this.unitsService.createUnitActivity(id, body, user);
  }

  @Post('activities/:activityId/submissions')
  async submitActivity(
    @Param('activityId', ParseIntPipe) activityId: number,
    @Body() body: { content?: string; fileUrl?: string },
    @CurrentUser() user: User,
  ) {
    return this.unitsService.submitActivity(activityId, body, user);
  }

  // =========================================================================
  // 4. EVALUACIONES / CUESTIONARIOS
  // =========================================================================

  @Get(':id/quiz')
  async getQuiz(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.unitsService.getUnitQuiz(id, user);
  }

  @Post(':id/quiz')
  async saveQuiz(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      title: string;
      description?: string;
      passingScore?: number;
      maxAttempts?: number;
      timeLimitMins?: number;
      questions?: Array<{
        questionText: string;
        questionType?: 'multiple_choice' | 'true_false' | 'short_answer';
        points?: number;
        explanation?: string;
        options: Array<{ optionText: string; isCorrect: boolean }>;
      }>;
    },
    @CurrentUser() user: User,
  ) {
    return this.unitsService.saveUnitQuiz(id, body, user);
  }

  @Post('quiz/:quizId/attempt')
  async submitQuizAttempt(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() body: { answers: Record<string, number> },
    @CurrentUser() user: User,
  ) {
    return this.unitsService.submitQuizAttempt(quizId, body.answers || {}, user);
  }
}
