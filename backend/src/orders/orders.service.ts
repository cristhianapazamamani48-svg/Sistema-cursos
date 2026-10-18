import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL, DRIZZLE_DB, DrizzleDb } from '../database/database.provider';
import { orders, transactions, enrollments, courses, auditLogs } from '../database/schema';
import { eq, and } from 'drizzle-orm';
import {
  CreateOrderDto,
  ConfirmManualPaymentDto,
  WebhookPaymentDto,
  AdminEnrollDto,
} from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
  ) {}

  /**
   * 1. Crear una orden de compra
   * Regla de negocio:
   * - Acceso vitalicio: Un estudiante no puede comprar dos veces el mismo curso (si ya tiene inscripción activa o completada).
   * - El monto se congela al crear la orden (orders.amount).
   * - Cursos gratis (price = 0): La orden se crea y se marca paid automáticamente, activando la inscripción en el mismo flujo.
   */
  async createOrder(userId: number, dto: CreateOrderDto) {
    const [course] = await this.db
      .select()
      .from(courses)
      .where(eq(courses.id, dto.courseId))
      .limit(1);

    if (!course) {
      throw new NotFoundException(`Curso #${dto.courseId} no encontrado`);
    }

    if (course.status !== 'published') {
      throw new BadRequestException('El curso no está disponible para compra');
    }

    // Verificar si el estudiante ya tiene una inscripción activa o completada
    const [existingEnrollment] = await this.db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, dto.courseId)))
      .limit(1);

    if (existingEnrollment && existingEnrollment.status !== 'cancelled') {
      throw new ConflictException('Ya tienes acceso a este curso');
    }

    // Verificar si ya existe una orden pendiente para este curso
    const [existingOrder] = await this.db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          eq(orders.courseId, dto.courseId),
          eq(orders.status, 'pending'),
        ),
      )
      .limit(1);

    if (existingOrder) {
      return {
        message: 'Ya tienes una orden de pago pendiente para este curso',
        order: existingOrder,
      };
    }

    const priceNum = Number(course.price);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Crear la orden con amount congelado
      const orderInsertRes = await client.query(
        `INSERT INTO orders (user_id, course_id, amount, currency, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, course_id, amount, currency, status;`,
        [userId, dto.courseId, course.price, course.currency, priceNum === 0 ? 'paid' : 'pending'],
      );
      const newOrder = orderInsertRes.rows[0];

      // Si el curso es gratuito (amount = 0), activar inscripción inmediatamente con Consulta E
      if (priceNum === 0) {
        await this.executeEnrollmentUpsert(client, userId, dto.courseId, newOrder.id, null);
      }

      await client.query('COMMIT');
      return {
        message: priceNum === 0 ? 'Curso gratuito activado con éxito' : 'Orden de compra creada',
        order: newOrder,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 2. Confirmación de pago manual por un Admin (transferencia bancaria / QR Simple con comprobante)
   */
  async confirmManualPayment(orderId: number, adminId: number, dto: ConfirmManualPaymentDto) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const orderRes = await client.query(
        `SELECT id, user_id, course_id, amount, status FROM orders WHERE id = $1 FOR UPDATE;`,
        [orderId],
      );

      if (orderRes.rowCount === 0) {
        throw new NotFoundException(`Orden #${orderId} no encontrada`);
      }

      const order = orderRes.rows[0];
      if (order.status === 'paid') {
        throw new BadRequestException('Esta orden ya fue pagada');
      }

      const now = new Date();

      // 1. Marcar orden como paid
      await client.query(
        `UPDATE orders
            SET status = 'paid',
                confirmed_by = $1,
                confirmed_at = $2,
                receipt_url = $3,
                updated_at = $2
          WHERE id = $4;`,
        [adminId, now, dto.receiptUrl || null, orderId],
      );

      // 2. Ejecutar Consulta E para crear o reactivar la inscripción
      const enrollmentId = await this.executeEnrollmentUpsert(
        client,
        order.user_id,
        order.course_id,
        orderId,
        null,
      );

      // 3. Auditoría en audit_logs
      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [
          adminId,
          'order.manual_paid',
          'orders',
          orderId,
          JSON.stringify({ enrollmentId, notes: dto.notes, receiptUrl: dto.receiptUrl }),
          now,
        ],
      );

      await client.query('COMMIT');
      return {
        message: 'Pago confirmado e inscripción activada exitosamente',
        orderId,
        enrollmentId,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 3. Webhook de Pasarela de Pagos (Idempotente)
   * Usa índice único transactions_provider_ref_unique para evitar procesar cobros dobles.
   */
  async handlePaymentWebhook(dto: WebhookPaymentDto) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Registrar la transacción con control de idempotencia
      let txId: number | null = null;
      try {
        const txRes = await client.query(
          `INSERT INTO transactions (order_id, provider, provider_reference, status, raw_response)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (provider, provider_reference) WHERE provider_reference IS NOT NULL DO NOTHING
           RETURNING id;`,
          [
            dto.orderId,
            dto.provider,
            dto.providerReference,
            dto.status,
            dto.rawResponse ? JSON.stringify(dto.rawResponse) : null,
          ],
        );
        if (txRes.rowCount === 0) {
          // Idempotencia: Transacción ya procesada previamente
          await client.query('ROLLBACK');
          return { status: 'already_processed', message: 'Notificación ya procesada con anterioridad' };
        }
        txId = txRes.rows[0].id;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }

      // Si la transacción no fue exitosa, no activamos inscripción
      if (dto.status !== 'completed') {
        await client.query('COMMIT');
        return { status: 'failed', message: 'Transacción registrada como fallida' };
      }

      // 2. Buscar la orden para marcarla paid
      const orderRes = await client.query(
        `SELECT id, user_id, course_id, status FROM orders WHERE id = $1 FOR UPDATE;`,
        [dto.orderId],
      );

      if (orderRes.rowCount === 0) {
        throw new NotFoundException(`Orden #${dto.orderId} no existe`);
      }

      const order = orderRes.rows[0];

      // Marcar orden como paid
      await client.query(
        `UPDATE orders SET status = 'paid', updated_at = now() WHERE id = $1;`,
        [dto.orderId],
      );

      // 3. Consulta E: Crear o Reactivar la inscripción
      const enrollmentId = await this.executeEnrollmentUpsert(
        client,
        order.user_id,
        order.course_id,
        dto.orderId,
        null,
      );

      await client.query('COMMIT');
      return {
        status: 'success',
        message: 'Pago procesado e inscripción activada',
        transactionId: txId,
        enrollmentId,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 4. Inscripción manual por Administrador (becas, convenios, etc.)
   * CHECK: order_id es NULL y enrolled_by tiene el ID del admin.
   */
  async adminEnrollUser(adminId: number, dto: AdminEnrollDto) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const enrollmentId = await this.executeEnrollmentUpsert(
        client,
        dto.userId,
        dto.courseId,
        null,
        adminId,
      );

      // Auditoría
      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, now());`,
        [
          adminId,
          'enrollment.manual_assigned',
          'enrollments',
          enrollmentId,
          JSON.stringify({ userId: dto.userId, courseId: dto.courseId }),
        ],
      );

      await client.query('COMMIT');
      return {
        message: 'Estudiante inscrito manualmente por administrador',
        enrollmentId,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Consulta E del diseño SQL:
   * INSERT o REACTIVACIÓN de inscripción (Upsert atómico).
   * Si la fila ya existía y estaba cancelled tras un reembolso, se reactiva.
   * Si ya tenía completed_at, vuelve como completed; de lo contrario active.
   * Conserva el enrollment_id, por lo que el progreso no se pierde.
   */
  private async executeEnrollmentUpsert(
    client: any,
    userId: number,
    courseId: number,
    orderId: number | null,
    enrolledBy: number | null,
  ): Promise<number> {
    const queryE = `
      INSERT INTO enrollments (user_id, course_id, order_id, enrolled_by, status)
      VALUES ($1, $2, $3, $4, 'active')
      ON CONFLICT (user_id, course_id) DO UPDATE
        SET status      = CASE WHEN enrollments.completed_at IS NOT NULL
                               THEN 'completed' ELSE 'active' END,
            order_id    = EXCLUDED.order_id,
            enrolled_by = EXCLUDED.enrolled_by,
            updated_at  = now()
        WHERE enrollments.status = 'cancelled'
      RETURNING id;
    `;

    const res = await client.query(queryE, [userId, courseId, orderId, enrolledBy]);
    if (res.rowCount && res.rowCount > 0) {
      return res.rows[0].id;
    }

    // Si ya existía activa/completada, devolver su ID actual
    const checkRes = await client.query(
      `SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2;`,
      [userId, courseId],
    );
    return checkRes.rows[0]?.id;
  }

  /**
   * Listar órdenes del usuario o de administración
   */
  async findUserOrders(userId: number) {
    return this.db.select().from(orders).where(eq(orders.userId, userId));
  }

  async findAllOrdersAdmin() {
    return this.db.select().from(orders);
  }
}
