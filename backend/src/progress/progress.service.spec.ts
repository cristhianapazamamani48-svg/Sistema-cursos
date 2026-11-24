import { Test, TestingModule } from '@nestjs/testing';
import { ProgressService } from './progress.service';
import { PG_POOL, DRIZZLE_DB } from '../database/database.provider';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ProgressService', () => {
  let service: ProgressService;
  let mockPool: { query: jest.Mock };
  let mockDb: any;

  beforeEach(async () => {
    mockPool = {
      query: jest.fn(),
    };
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        { provide: PG_POOL, useValue: mockPool },
        { provide: DRIZZLE_DB, useValue: mockDb },
      ],
    }).compile();

    service = module.get<ProgressService>(ProgressService);
  });

  describe('handleHeartbeat', () => {
    it('debe rechazar el latido si el progreso no existe', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(
        service.handleHeartbeat({ progressId: 99, currentPositionSeconds: 10 }, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar el latido si el usuario no es el dueño', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            user_id: 2, // Otro usuario
            enrollment_id: 10,
            enrollment_status: 'active',
            lesson_status: 'published',
            module_order: 1,
            course_id: 5,
          },
        ],
      });

      await expect(
        service.handleHeartbeat({ progressId: 1, currentPositionSeconds: 10 }, 1),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe ignorar el latido si el rate limit de 5s no se cumple (0 filas afectadas en Query D)', async () => {
      // 1. owner check
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            user_id: 1,
            enrollment_id: 10,
            enrollment_status: 'active',
            lesson_status: 'published',
            module_order: 1,
            course_id: 5,
          },
        ],
      });
      // 2. prevModulesRes check
      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // 3. queryD (Heartbeat atómico con rate-limit de 5 segundos) -> 0 filas actualizadas
      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const result = await service.handleHeartbeat(
        { progressId: 1, currentPositionSeconds: 12 },
        1,
      );

      expect(result.accepted).toBe(false);
      expect(result.message).toContain('Latido ignorado');
    });

    it('debe aceptar rango de bloques (reproducción 2x) y registrar completitud al alcanzar el umbral', async () => {
      // 1. owner check
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            user_id: 1,
            enrollment_id: 10,
            enrollment_status: 'active',
            lesson_status: 'published',
            module_order: 1,
            course_id: 5,
          },
        ],
      });
      // 2. prevModulesRes check
      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // 3. queryD -> aceptado
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });
      // 4. queryB -> evaluado como completado (cardinality >= min_watch_percentage)
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            watched_count: 9,
            total_blocks: 10,
            min_watch_percentage: 85,
            is_completed: true,
            already_completed: false,
          },
        ],
      });
      // 5. UPDATE lesson_progress SET is_completed = true ...
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      // 6. queryF -> verificar si completó todo el curso (course_completed: true)
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ course_completed: true }],
      });
      // 7. UPDATE enrollments SET status = 'completed' ...
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const result = await service.handleHeartbeat(
        {
          progressId: 1,
          currentPositionSeconds: 90,
          blocks: [7, 8], // Soporte de rango para 2x
        },
        1,
      );

      expect(result.accepted).toBe(true);
      expect(result.isCompleted).toBe(true);
      expect(result.courseCompleted).toBe(true);
    });
  });

  describe('getOrCreateProgress', () => {
    it('debe lanzar ForbiddenException si no existe inscripción para el curso', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(service.getOrCreateProgress(1, 10)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
