import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service';
import { PG_POOL, DRIZZLE_DB } from '../database/database.provider';
import { User } from '../database/schema/users.schema';

describe('CoursesService', () => {
  let service: CoursesService;
  let mockPool: { query: jest.Mock };
  let mockDb: any;
  let currentCourse: any;
  let currentModules: any[];

  const mockAdminUser = {
    id: 1,
    role: 'admin',
    email: 'admin@sistema.com',
    fullName: 'Admin',
    status: 'active',
  } as unknown as User;

  const mockDocenteUser = {
    id: 2,
    role: 'docente',
    email: 'docente@sistema.com',
    fullName: 'Docente',
    status: 'active',
  } as unknown as User;

  beforeEach(async () => {
    mockPool = {
      query: jest.fn(),
    };
    currentCourse = null;
    currentModules = [];

    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockImplementation(() => ({
        limit: jest.fn().mockImplementation(() => Promise.resolve(currentCourse ? [currentCourse] : [])),
        then: (resolve: any) => resolve(currentModules),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PG_POOL, useValue: mockPool },
        { provide: DRIZZLE_DB, useValue: mockDb },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  describe('getPublishChecklist', () => {
    it('debe impedir publicación (canPublish: false) si el curso no tiene portada', async () => {
      // 1. Curso encontrado sin portada
      currentCourse = {
        id: 10,
        title: 'Curso de Especialización',
        thumbnailUrl: '', // Sin portada
        status: 'draft',
        createdBy: 2,
      };
      // 2. Módulos activos
      currentModules = [{ id: 1, title: 'Módulo 1' }];

      // 3. Consulta de lecciones
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 101,
            lessonTitle: 'Lección 1',
            videoId: 5,
            lessonStatus: 'published',
            moduleTitle: 'Módulo 1',
            videoStatus: 'approved',
            videoTitle: 'Video 1',
          },
        ],
      });

      const res = await service.getPublishChecklist(10, mockDocenteUser);

      expect(res.canPublish).toBe(false);
      expect(res.checklist.thumbnail.passed).toBe(false);
    });

    it('debe impedir publicación (canPublish: false) si todas las lecciones están en borrador', async () => {
      // 1. Curso completo con portada
      currentCourse = {
        id: 10,
        title: 'Curso de Especialización',
        thumbnailUrl: 'https://cdn.com/thumb.jpg',
        status: 'draft',
        createdBy: 2,
      };
      // 2. Módulos activos
      currentModules = [{ id: 1, title: 'Módulo 1' }];

      // 3. Lección existe con video aprobado pero status 'draft' (ninguna 'published')
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 101,
            lessonTitle: 'Lección 1',
            videoId: 5,
            lessonStatus: 'draft', // En borrador
            moduleTitle: 'Módulo 1',
            videoStatus: 'approved',
            videoTitle: 'Video 1',
          },
        ],
      });

      const res = await service.getPublishChecklist(10, mockDocenteUser);

      expect(res.canPublish).toBe(false);
      expect(res.checklist.lessons.passed).toBe(false);
      expect(res.checklist.lessons.issues).toEqual(
        expect.arrayContaining([
          expect.stringContaining('al menos una lección con estado publicado'),
        ]),
      );
    });

    it('debe permitir publicación (canPublish: true) cuando se cumplen todos los requisitos', async () => {
      // 1. Curso con título y portada
      currentCourse = {
        id: 10,
        title: 'Curso de Especialización',
        thumbnailUrl: 'https://cdn.com/thumb.jpg',
        status: 'draft',
        createdBy: 2,
      };
      // 2. Módulos activos
      currentModules = [{ id: 1, title: 'Módulo 1' }];

      // 3. Lección con video aprobado y status 'published'
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 101,
            lessonTitle: 'Lección 1',
            videoId: 5,
            lessonStatus: 'published',
            moduleTitle: 'Módulo 1',
            videoStatus: 'approved',
            videoTitle: 'Video 1',
          },
        ],
      });

      const res = await service.getPublishChecklist(10, mockDocenteUser);

      expect(res.canPublish).toBe(true);
      expect(res.checklist.title.passed).toBe(true);
      expect(res.checklist.thumbnail.passed).toBe(true);
      expect(res.checklist.modules.passed).toBe(true);
      expect(res.checklist.lessons.passed).toBe(true);
    });
  });
});
