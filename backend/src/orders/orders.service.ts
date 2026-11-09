import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL, DRIZZLE_DB, DrizzleDb } from '../database/database.provider';
import { orders, enrollments, courses } from '../database/schema';
import { eq, and } from 'drizzle-orm';
import {
  CreateOrderDto,
  ConfirmManualPaymentDto,
  WebhookPaymentDto,
  AdminEnrollDto,
  RejectOrderDto,
} from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
  ) {}

  /**
   * 1. Crear una orden de compra
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

    const [existingEnrollment] = await this.db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, dto.courseId)))
      .limit(1);

    if (existingEnrollment && existingEnrollment.status !== 'cancelled') {
      throw new ConflictException('Ya tienes acceso a este curso');
    }

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

      const orderInsertRes = await client.query(
        `INSERT INTO orders (user_id, course_id, amount, currency, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, course_id, amount, currency, status;`,
        [userId, dto.courseId, course.price, course.currency, priceNum === 0 ? 'paid' : 'pending'],
      );
      const newOrder = orderInsertRes.rows[0];

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
   * 2. Confirmación de pago manual por un Admin
   * Solo se puede confirmar órdenes en estado 'pending'.
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

      if (order.status !== 'pending') {
        throw new BadRequestException(
          `Solo se pueden aprobar órdenes pendientes. Esta orden está en estado '${order.status}'`,
        );
      }

      const now = new Date();

      await client.query(
        `UPDATE orders
            SET status       = 'paid',
                confirmed_by = $1,
                confirmed_at = $2,
                receipt_url  = $3,
                updated_at   = $2
          WHERE id = $4;`,
        [adminId, now, dto.receiptUrl || null, orderId],
      );

      const enrollmentId = await this.executeEnrollmentUpsert(
        client,
        order.user_id,
        order.course_id,
        orderId,
        null,
      );

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
   * 3. Rechazar una orden pendiente (marca como 'failed')
   */
  async rejectOrder(orderId: number, adminId: number, dto: RejectOrderDto) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const orderRes = await client.query(
        `SELECT id, status FROM orders WHERE id = $1 FOR UPDATE;`,
        [orderId],
      );

      if (orderRes.rowCount === 0) {
        throw new NotFoundException(`Orden #${orderId} no encontrada`);
      }

      const order = orderRes.rows[0];

      if (order.status !== 'pending') {
        throw new BadRequestException(
          `Solo se pueden rechazar órdenes pendientes. Esta orden está en estado '${order.status}'`,
        );
      }

      await client.query(
        `UPDATE orders
            SET status       = 'failed',
                confirmed_by = $1,
                confirmed_at = now(),
                updated_at   = now()
          WHERE id = $2;`,
        [adminId, orderId],
      );

      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, now());`,
        [adminId, 'order.rejected', 'orders', orderId, JSON.stringify({ reason: dto.reason })],
      );

      await client.query('COMMIT');
      return { message: 'Orden rechazada correctamente', orderId };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 4. Webhook de Pasarela de Pagos (Idempotente)
   */
  async handlePaymentWebhook(dto: WebhookPaymentDto) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

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
          await client.query('ROLLBACK');
          return { status: 'already_processed', message: 'Notificación ya procesada con anterioridad' };
        }
        txId = txRes.rows[0].id;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }

      if (dto.status !== 'completed') {
        await client.query('COMMIT');
        return { status: 'failed', message: 'Transacción registrada como fallida' };
      }

      const orderRes = await client.query(
        `SELECT id, user_id, course_id, status FROM orders WHERE id = $1 FOR UPDATE;`,
        [dto.orderId],
      );

      if (orderRes.rowCount === 0) {
        throw new NotFoundException(`Orden #${dto.orderId} no existe`);
      }

      const order = orderRes.rows[0];

      await client.query(
        `UPDATE orders SET status = 'paid', updated_at = now() WHERE id = $1;`,
        [dto.orderId],
      );

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
   * 5. Inscripción manual por Administrador (becas, convenios, etc.)
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
   * Consulta E: INSERT o REACTIVACIÓN de inscripción (Upsert atómico).
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

    const checkRes = await client.query(
      `SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2;`,
      [userId, courseId],
    );
    return checkRes.rows[0]?.id;
  }

  /**
   * Listar órdenes del usuario autenticado
   */
  async findUserOrders(userId: number) {
    return this.db.select().from(orders).where(eq(orders.userId, userId));
  }

  /**
   * Listar todas las órdenes para administración, con datos de estudiante y curso
   */
  async findAllOrdersAdmin() {
    const result = await this.pool.query(`
      SELECT
        o.id,
        o.user_id,
        o.course_id,
        o.amount,
        o.currency,
        o.status,
        o.receipt_url,
        o.confirmed_by,
        o.confirmed_at,
        o.created_at,
        u.name        AS student_name,
        u.email       AS student_email,
        c.title       AS course_title,
        c.slug        AS course_slug
      FROM orders o
      LEFT JOIN users  u ON u.id = o.user_id
      LEFT JOIN courses c ON c.id = o.course_id
      ORDER BY
        CASE o.status WHEN 'pending' THEN 0 ELSE 1 END,
        o.created_at DESC
      LIMIT 200;
    `);
    return result.rows;
  }
}
