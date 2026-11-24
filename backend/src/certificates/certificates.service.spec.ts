import { Test, TestingModule } from '@nestjs/testing';
import { CertificatesService } from './certificates.service';
import { PG_POOL, DRIZZLE_DB } from '../database/database.provider';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { User } from '../database/schema/users.schema';

describe('CertificatesService', () => {
  let service: CertificatesService;
  let mockPool: { query: jest.Mock };
  let mockDb: any;

  const mockStudentUser = {
    id: 1,
    role: 'estudiante',
    email: 'estudiante@test.com',
    fullName: 'Juan Pérez',
    status: 'active',
  } as unknown as User;

  beforeEach(async () => {
    mockPool = {
      query: jest.fn(),
    };
    mockDb = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificatesService,
        { provide: PG_POOL, useValue: mockPool },
        { provide: DRIZZLE_DB, useValue: mockDb },
      ],
    }).compile();

    service = module.get<CertificatesService>(CertificatesService);
  });

  describe('issueCertificate', () => {
    it('debe lanzar NotFoundException si la inscripción no existe', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(service.issueCertificate(99, mockStudentUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar ForbiddenException si el usuario no es el dueño de la inscripción', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            enrollment_id: 10,
            user_id: 99, // Otro usuario
            course_id: 5,
            enrollment_status: 'completed',
            full_name: 'Otro Usuario',
            email: 'otro@test.com',
            course_title: 'Curso X',
            course_slug: 'curso-x',
          },
        ],
      });

      await expect(service.issueCertificate(10, mockStudentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debe retornar certificado existente si ya fue emitido previamente', async () => {
      // 1. Enrollment res
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            enrollment_id: 10,
            user_id: 1,
            course_id: 5,
            enrollment_status: 'completed',
            full_name: 'Juan Pérez',
            email: 'estudiante@test.com',
            course_title: 'Curso de Especialización',
            course_slug: 'curso-especializacion',
          },
        ],
      });
      // 2. Existing certificate check -> encontrado
      const existingCert = {
        id: 77,
        code: 'CERT-2026-AAAA-BBBB',
        enrollmentId: 10,
        userId: 1,
        courseId: 5,
        studentName: 'Juan Pérez',
        courseTitle: 'Curso de Especialización',
        workloadHours: 40,
        issuedAt: new Date(),
      };
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [existingCert],
      });

      const cert = await service.issueCertificate(10, mockStudentUser);

      expect(cert.code).toBe('CERT-2026-AAAA-BBBB');
      expect(cert.studentName).toBe('Juan Pérez');
    });

    it('debe impedir emisión si el estudiante no ha completado el 100% de las lecciones', async () => {
      // 1. Enrollment res con status 'active' (no 'completed')
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            enrollment_id: 10,
            user_id: 1,
            course_id: 5,
            enrollment_status: 'active',
            full_name: 'Juan Pérez',
            email: 'estudiante@test.com',
            course_title: 'Curso de Especialización',
            course_slug: 'curso-especializacion',
          },
        ],
      });
      // 2. Existing cert check -> 0
      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // 3. Progress check -> 2 lecciones completadas de 5 totales
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ total_lessons: 5, completed_lessons: 2 }],
      });

      await expect(service.issueCertificate(10, mockStudentUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe emitir nuevo certificado con código único si el curso está completado', async () => {
      // 1. Enrollment res con status 'completed'
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            enrollment_id: 10,
            user_id: 1,
            course_id: 5,
            enrollment_status: 'completed',
            full_name: 'Juan Pérez',
            email: 'estudiante@test.com',
            course_title: 'Curso de Especialización',
            course_slug: 'curso-especializacion',
            total_seconds: 36000, // 10 horas
          },
        ],
      });
      // 2. Existing cert check -> 0
      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // 3. Insert cert
      mockPool.query.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('INSERT INTO certificates')) {
          return Promise.resolve({
            rowCount: 1,
            rows: [
              {
                id: 1,
                code: params[0],
                enrollmentId: params[1],
                userId: params[2],
                courseId: params[3],
                studentName: params[4],
                courseTitle: params[5],
                workloadHours: params[6],
                issuedAt: new Date(),
              },
            ],
          });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      const cert = await service.issueCertificate(10, mockStudentUser);

      expect(cert.code).toMatch(/^CERT-2026-/);
      expect(cert.studentName).toBe('Juan Pérez');
      expect(cert.courseTitle).toBe('Curso de Especialización');
    });
  });

  describe('verifyCertificate', () => {
    it('debe retornar valid: false si el código no existe', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const res = await service.verifyCertificate('CERT-INEXISTENTE');
      expect(res.valid).toBe(false);
      expect(res.message).toContain('no encontrado');
    });

    it('debe retornar valid: true con detalles si el código es válido', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            code: 'CERT-2026-F4A1-XYZ1',
            studentName: 'Ana Morales',
            courseTitle: 'Gestión Pública y Contrataciones',
            workloadHours: 40,
            issuedAt: new Date(),
            courseSlug: 'gestion-publica',
          },
        ],
      });

      const res = await service.verifyCertificate('CERT-2026-F4A1-XYZ1');
      expect(res.valid).toBe(true);
      expect(res.certificate?.studentName).toBe('Ana Morales');
      expect(res.certificate?.courseTitle).toBe('Gestión Pública y Contrataciones');
    });
  });
});
