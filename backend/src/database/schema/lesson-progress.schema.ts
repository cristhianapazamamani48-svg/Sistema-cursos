import { pgTable, bigint, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { enrollments } from './enrollments.schema';
import { lessons } from './lessons.schema';

export const lessonProgress = pgTable('lesson_progress', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  enrollmentId: bigint('enrollment_id', { mode: 'number' })
    .notNull()
    .references(() => enrollments.id, { onDelete: 'cascade' }),
  lessonId: bigint('lesson_id', { mode: 'number' })
    .notNull()
    .references(() => lessons.id),
  // integer[] nativo de PostgreSQL
  watchedBlocks: integer('watched_blocks').array().notNull().default([]),
  lastPositionSeconds: integer('last_position_seconds').notNull().default(0),
  lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
  isCompleted: boolean('is_completed').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type LessonProgress = typeof lessonProgress.$inferSelect;
export type NewLessonProgress = typeof lessonProgress.$inferInsert;
