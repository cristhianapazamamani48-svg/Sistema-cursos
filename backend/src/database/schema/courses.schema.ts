import { pgTable, bigint, text, numeric, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const courseStatusValues = ['draft', 'published', 'archived'] as const;
export type CourseStatus = (typeof courseStatusValues)[number];

export const currencyValues = ['BOB', 'USD'] as const;
export type Currency = (typeof currencyValues)[number];

export const courses = pgTable('courses', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
  currency: text('currency', { enum: currencyValues }).notNull().default('BOB'),
  status: text('status', { enum: courseStatusValues }).notNull().default('draft'),
  minWatchPercentage: integer('min_watch_percentage').notNull().default(85),
  createdBy: bigint('created_by', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const courseDocentes = pgTable('course_docentes', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  courseId: bigint('course_id', { mode: 'number' })
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const modules = pgTable('modules', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  courseId: bigint('course_id', { mode: 'number' })
    .notNull()
    .references(() => courses.id),
  title: text('title').notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type CourseDocente = typeof courseDocentes.$inferSelect;
export type NewCourseDocente = typeof courseDocentes.$inferInsert;
export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;
