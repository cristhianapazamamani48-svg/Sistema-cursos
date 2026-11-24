import { pgTable, bigint, text, integer, timestamp, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { courses } from './courses.schema';
import { enrollments } from './enrollments.schema';

export const certificates = pgTable('certificates', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  code: varchar('code', { length: 36 }).notNull().unique(),
  enrollmentId: bigint('enrollment_id', { mode: 'number' })
    .notNull()
    .unique()
    .references(() => enrollments.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  courseId: bigint('course_id', { mode: 'number' })
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  studentName: text('student_name').notNull(),
  courseTitle: text('course_title').notNull(),
  workloadHours: integer('workload_hours').notNull().default(40),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Certificate = typeof certificates.$inferSelect;
export type NewCertificate = typeof certificates.$inferInsert;
