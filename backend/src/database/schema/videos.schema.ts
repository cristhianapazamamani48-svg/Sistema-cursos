import { pgTable, bigint, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const videoProviderValues = ['youtube', 'cloudflare', 'vimeo'] as const;
export type VideoProvider = (typeof videoProviderValues)[number];

export const videoStatusValues = ['pending', 'approved', 'rejected'] as const;
export type VideoStatus = (typeof videoStatusValues)[number];

export const videos = pgTable('videos', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  title: text('title').notNull(),
  provider: text('provider', { enum: videoProviderValues }).notNull(),
  providerRef: text('provider_ref').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  uploadedBy: bigint('uploaded_by', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  status: text('status', { enum: videoStatusValues }).notNull().default('pending'),
  rejectionReason: text('rejection_reason'),
  reviewedBy: bigint('reviewed_by', { mode: 'number' }).references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
