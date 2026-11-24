import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PG_POOL, DRIZZLE_DB } from '../database/database.provider';
import { ConflictException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockPool: { query: jest.Mock; connect: jest.Mock };
  let mockDb: any;
  let mockClient: any;

  beforeEach(async () => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
    };
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PG_POOL, useValue: mockPool },
        { provide: DRIZZLE_DB, useValue: mockDb },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('createOrder', () => {
    it('debe rechazar la orden si el usuario ya tiene una inscripción activa', async () => {
      // 1. Curso publicado encontrado
      mockDb.limit.mockResolvedValueOnce([
        { id: 10, status: 'published', price: '250.00', currency: 'BOB' },
      ]);
      // 2. Inscripción activa previa
      mockDb.limit.mockResolvedValueOnce([{ id: 1, status: 'active' }]);

      await expect(
        service.createOrder(1, { courseId: 10 }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe crear la orden con el monto y moneda congelados del curso', async () => {
      // 1. Curso publicado encontrado
      mockDb.limit.mockResolvedValueOnce([
        {
          id: 10,
          title: 'Curso de Especialización',
          price: '250.00',
          currency: 'BOB',
          status: 'published',
        },
      ]);
      // 2. Sin inscripción activa previa
      mockDb.limit.mockResolvedValueOnce([]);
      // 3. Sin orden pendiente previa
      mockDb.limit.mockResolvedValueOnce([]);

      const fakeOrder = {
        id: 101,
        userId: 1,
        courseId: 10,
        amount: '250.00',
        currency: 'BOB',
        status: 'pending',
      };

      // client.query calls:
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [fakeOrder] }) // INSERT INTO orders RETURNING ...
        .mockResolvedValueOnce({}) // INSERT INTO audit_logs
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.createOrder(1, {
        courseId: 10,
      });

      expect(result.id).toBe(101);
      expect(result.amount).toBe('250.00');
      expect(result.status).toBe('pending');
      expect(result.order).toEqual(fakeOrder);
    });
  });

  describe('executeEnrollmentUpsert (privado via confirmación)', () => {
    it('debe ejecutar el upsert con ON CONFLICT para reactivar inscripción cancelada', async () => {
      // Llamamos a confirmManualPayment para verificar que la transacción ejecuta el upsert de enrollments
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          // SELECT ... FOR UPDATE
          rowCount: 1,
          rows: [{ id: 101, user_id: 1, course_id: 10, status: 'pending' }],
        })
        .mockResolvedValueOnce({}) // UPDATE orders SET status = 'paid'
        .mockResolvedValueOnce({
          // INSERT INTO enrollments ... ON CONFLICT DO UPDATE
          rowCount: 1,
          rows: [{ id: 55 }],
        })
        .mockResolvedValueOnce({}) // INSERT INTO audit_logs
        .mockResolvedValueOnce({}); // COMMIT

      const res = await service.confirmManualPayment(101, 999, {
        receiptUrl: 'https://recibo.com/1.pdf',
      });

      expect(res.enrollmentId).toBe(55);

      // Verificar que el query de enrollments contiene ON CONFLICT y WHERE status = 'cancelled'
      const enrollQueryCall = mockClient.query.mock.calls.find((call: any[]) =>
        call[0]?.includes('INSERT INTO enrollments'),
      );
      expect(enrollQueryCall).toBeDefined();
      expect(enrollQueryCall[0]).toContain('ON CONFLICT (user_id, course_id) DO UPDATE');
      expect(enrollQueryCall[0]).toContain("WHERE enrollments.status = 'cancelled'");
    });
  });
});
