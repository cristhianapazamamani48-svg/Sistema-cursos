import { Test, TestingModule } from '@nestjs/testing';
import { UnitsService } from './units.service';
import { PG_POOL, DRIZZLE_DB } from '../database/database.provider';
import { BadRequestException } from '@nestjs/common';
import { User } from '../database/schema/users.schema';

describe('UnitsService', () => {
  let service: UnitsService;
  let mockPool: { query: jest.Mock; connect: jest.Mock };
  let mockDb: any;
  let mockClient: any;

  const mockTeacher = {
    id: 1,
    role: 'docente',
    email: 'docente@test.com',
    fullName: 'Prof. Mario',
    status: 'active',
  } as unknown as User;

  const mockStudent = {
    id: 2,
    role: 'estudiante',
    email: 'estudiante@test.com',
    fullName: 'Estudiante Ana',
    status: 'active',
  } as unknown as User;

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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitsService,
        { provide: PG_POOL, useValue: mockPool },
        { provide: DRIZZLE_DB, useValue: mockDb },
      ],
    }).compile();

    service = module.get<UnitsService>(UnitsService);
  });

  describe('updateStudyMaterial', () => {
    it('debe actualizar el enlace y contenido del material de estudio si el docente es dueño', async () => {
      jest.spyOn(service, 'assertUnitTeacher').mockResolvedValue(undefined as any);

      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 101,
            title: 'Unidad 1',
            studyMaterialUrl: 'https://clases.com/modulo1/video',
            studyMaterialContent: 'Resumen de la unidad',
          },
        ],
      });

      const res = await service.updateStudyMaterial(
        101,
        {
          studyMaterialUrl: 'https://clases.com/modulo1/video',
          studyMaterialContent: 'Resumen de la unidad',
        },
        mockTeacher,
      );

      expect(res.studyMaterialUrl).toBe('https://clases.com/modulo1/video');
      expect(res.studyMaterialContent).toBe('Resumen de la unidad');
    });
  });

  describe('postForumMessage', () => {
    beforeEach(() => {
      jest.spyOn(service, 'assertUnitAccess').mockResolvedValue(undefined as any);
    });

    it('debe rechazar un mensaje vacío', async () => {
      // 1. getUnitForum -> SELECT forum (retorna isClosed en camelCase, igual que el alias SQL)
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 5, lessonId: 101, title: 'Foro', isClosed: false }],
      });
      // 2. SELECT mensajes del foro
      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(
        service.postForumMessage(101, { message: '   ' }, mockTeacher),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe impedir publicar si el foro está cerrado', async () => {
      // 1. getUnitForum -> isClosed = true (camelCase como retorna la query SQL con alias)
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 5, lessonId: 101, title: 'Foro', isClosed: true }],
      });
      // 2. SELECT mensajes del foro
      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(
        service.postForumMessage(101, { message: 'Consulta de prueba' }, mockTeacher),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitQuizAttempt', () => {
    beforeEach(() => {
      jest.spyOn(service, 'assertUnitAccess').mockResolvedValue(undefined as any);
    });

    it('debe calificar automáticamente y aprobar si el puntaje supera passingScore', async () => {
      // 1. Obtener quiz
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 20, lesson_id: 101, passing_score: 70, max_attempts: 3 }],
      });
      // 2. prevAttempts count = 0
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ count: 0 }] });
      // 3. Preguntas y respuestas correctas (2 preguntas, 1 punto cada una)
      mockPool.query.mockResolvedValueOnce({
        rowCount: 2,
        rows: [
          { id: 1, points: 1, correct_option_id: 10 },
          { id: 2, points: 1, correct_option_id: 20 },
        ],
      });
      // 4. INSERT INTO quiz_attempts
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 1,
            score: 100,
            passed: true,
            attemptNumber: 1,
            completedAt: new Date(),
          },
        ],
      });

      const res = await service.submitQuizAttempt(
        20,
        {
          '1': 10, // Correcta
          '2': 20, // Correcta
        },
        mockStudent,
      );

      expect(res.score).toBe(100);
      expect(res.passed).toBe(true);
      expect(res.earnedPoints).toBe(2);
    });

    it('debe rechazar el intento si se alcanzó el límite de maxAttempts', async () => {
      // 1. Obtener quiz
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 20, lesson_id: 101, passing_score: 70, max_attempts: 2 }],
      });
      // 2. prevAttempts count = 2 (límite alcanzado)
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ count: 2 }] });

      await expect(
        service.submitQuizAttempt(20, { '1': 10 }, mockStudent),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
