import {
  pgTable,
  bigint,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { lessons } from './lessons.schema';

// 1. Actividades Prácticas
export const unitActivities = pgTable('unit_activities', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  lessonId: bigint('lesson_id', { mode: 'number' })
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  instructions: text('instructions'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const activitySubmissions = pgTable('activity_submissions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  activityId: bigint('activity_id', { mode: 'number' })
    .notNull()
    .references(() => unitActivities.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content'),
  fileUrl: text('file_url'),
  grade: numeric('grade', { precision: 5, scale: 2 }),
  feedback: text('feedback'),
  status: text('status', { enum: ['submitted', 'graded', 'returned'] })
    .notNull()
    .default('submitted'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 2. Foros de Discusión de la Unidad
export const unitForums = pgTable('unit_forums', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  lessonId: bigint('lesson_id', { mode: 'number' })
    .notNull()
    .unique()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  isClosed: boolean('is_closed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const forumMessages = pgTable('forum_messages', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  forumId: bigint('forum_id', { mode: 'number' })
    .notNull()
    .references(() => unitForums.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  parentId: bigint('parent_id', { mode: 'number' }),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 3. Evaluaciones / Cuestionarios
export const quizzes = pgTable('quizzes', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  lessonId: bigint('lesson_id', { mode: 'number' })
    .notNull()
    .unique()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  passingScore: integer('passing_score').notNull().default(70),
  maxAttempts: integer('max_attempts').notNull().default(3),
  timeLimitMins: integer('time_limit_mins'),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const quizQuestions = pgTable('quiz_questions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  quizId: bigint('quiz_id', { mode: 'number' })
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(),
  questionType: text('question_type', {
    enum: ['multiple_choice', 'true_false', 'short_answer'],
  })
    .notNull()
    .default('multiple_choice'),
  points: integer('points').notNull().default(1),
  orderIndex: integer('order_index').notNull().default(1),
  explanation: text('explanation'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const quizOptions = pgTable('quiz_options', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  questionId: bigint('question_id', { mode: 'number' })
    .notNull()
    .references(() => quizQuestions.id, { onDelete: 'cascade' }),
  optionText: text('option_text').notNull(),
  isCorrect: boolean('is_correct').notNull().default(false),
  orderIndex: integer('order_index').notNull().default(1),
});

export const quizAttempts = pgTable('quiz_attempts', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  quizId: bigint('quiz_id', { mode: 'number' })
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  score: numeric('score', { precision: 5, scale: 2 }).notNull().default('0'),
  passed: boolean('passed').notNull().default(false),
  answers: jsonb('answers').notNull().default({}),
  attemptNumber: integer('attempt_number').notNull().default(1),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
});
