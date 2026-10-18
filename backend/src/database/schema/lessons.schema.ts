import { pgTable, bigint, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { modules } from './courses.schema';
import { videos } from './videos.schema';

export const lessonStatusValues = ['draft', 'published', 'archived'] as const;
export type LessonStatus = (typeof lessonStatusValues)[number];

export const resourceTypeValues = ['pdf', 'link', 'image', 'other'] as const;
export type ResourceType = (typeof resourceTypeValues)[number];

export const lessons = pgTable('lessons', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  moduleId: bigint('module_id', { mode: 'number' })
    .notNull()
    .references(() => modules.id),
  videoId: bigint('video_id', { mode: 'number' }).references(() => videos.id),
  title: text('title').notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull(),
  status: text('status', { enum: lessonStatusValues }).notNull().default('draft'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const resources = pgTable('resources', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  lessonId: bigint('lesson_id', { mode: 'number' })
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  type: text('type', { enum: resourceTypeValues }).notNull(),
  url: text('url').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
