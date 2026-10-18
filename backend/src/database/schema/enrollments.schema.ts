import { pgTable, bigint, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { courses } from './courses.schema';
import { orders } from './orders.schema';

export const enrollmentStatusValues = ['active', 'completed', 'cancelled'] as const;
export type EnrollmentStatus = (typeof enrollmentStatusValues)[number];

export const enrollments = pgTable('enrollments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  courseId: bigint('course_id', { mode: 'number' })
    .notNull()
    .references(() => courses.id),
  orderId: bigint('order_id', { mode: 'number' }).references(() => orders.id),
  enrolledBy: bigint('enrolled_by', { mode: 'number' }).references(() => users.id),
  status: text('status', { enum: enrollmentStatusValues }).notNull().default('active'),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;
