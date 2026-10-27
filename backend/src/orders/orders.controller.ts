import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  createOrderSchema,
  ConfirmManualPaymentDto,
  confirmManualPaymentSchema,
  WebhookPaymentDto,
  webhookPaymentSchema,
  AdminEnrollDto,
  adminEnrollSchema,
} from './dto/order.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/schema/users.schema';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // 1. Crear orden (Estudiante autenticado)
  @Post()
  @UseGuards(SessionGuard)
  async createOrder(@Body() body: unknown, @CurrentUser() user: User) {
    const parseResult = createOrderSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de orden inválidos',
        errors: parseResult.error.format(),
      });
    }
    return this.ordersService.createOrder(user.id, parseResult.data);
  }

  // 2. Mis órdenes (Estudiante autenticado)
  @Get('my')
  @UseGuards(SessionGuard)
  async findMyOrders(@CurrentUser() user: User) {
    return this.ordersService.findUserOrders(user.id);
  }

  // 3. Confirmar pago manual con comprobante (Admin / Superadmin)
  @Post(':id/confirm-manual')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async confirmManualPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @CurrentUser() admin: User,
  ) {
    const parseResult = confirmManualPaymentSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de confirmación inválidos',
        errors: parseResult.error.format(),
      });
    }
    return this.ordersService.confirmManualPayment(id, admin.id, parseResult.data);
  }

  // 4. Inscripción manual directa sin orden (Admin / Superadmin)
  @Post('admin/enroll')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async adminEnroll(
    @Body() body: unknown,
    @CurrentUser() admin: User,
  ) {
    const parseResult = adminEnrollSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Datos de inscripción inválidos',
        errors: parseResult.error.format(),
      });
    }
    return this.ordersService.adminEnrollUser(admin.id, parseResult.data);
  }

  // 5. Listar todas las órdenes (Admin / Superadmin)
  @Get('admin/all')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async findAllOrdersAdmin() {
    return this.ordersService.findAllOrdersAdmin();
  }

  // 6. Webhook desactivado: pendiente de firma HMAC y pasarela
  @Post('webhook')
  async handleWebhook() {
    // pendiente de firma HMAC y pasarela
    throw new HttpException(
      {
        statusCode: HttpStatus.NOT_IMPLEMENTED,
        message: 'Webhook de pagos desactivado. Pendiente de firma HMAC y configuración de pasarela.',
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
