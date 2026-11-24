import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/schema/users.schema';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  /**
   * Emite o recupera el certificado oficial para una inscripción completada
   */
  @Post('issue/:enrollmentId')
  @UseGuards(SessionGuard)
  async issue(
    @Param('enrollmentId', ParseIntPipe) enrollmentId: number,
    @CurrentUser() user: User,
  ) {
    return this.certificatesService.issueCertificate(enrollmentId, user);
  }

  /**
   * Obtiene todos los certificados del estudiante autenticado
   */
  @Get('my')
  @UseGuards(SessionGuard)
  async getMyCertificates(@CurrentUser() user: User) {
    return this.certificatesService.getMyCertificates(user.id);
  }

  /**
   * Obtiene el certificado de una inscripción específica
   */
  @Get('enrollment/:enrollmentId')
  @UseGuards(SessionGuard)
  async getByEnrollment(
    @Param('enrollmentId', ParseIntPipe) enrollmentId: number,
    @CurrentUser() user: User,
  ) {
    return this.certificatesService.getCertificateByEnrollment(enrollmentId, user);
  }

  /**
   * Endpoint PÚBLICO: Verifica autenticidad de un certificado por código
   */
  @Get('verify/:code')
  async verify(@Param('code') code: string) {
    return this.certificatesService.verifyCertificate(code);
  }
}
