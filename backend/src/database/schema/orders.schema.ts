import { pgTable, bigint, text, numeric, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { courses } from './courses.schema';

export const orderStatusValues = ['pending', 'paid', 'failed', 'refunded', 'expired'] as const;
export type OrderStatus = (typeof orderStatusValues)[number];

export const transactionProviderValues = [
  'qr_simple',
  'tigo_money',
  'yolo',
  'card',
  'bank_transfer',
  'other',
] as const;
export type TransactionProvider = (typeof transactionProviderValues)[number];

export const transactionStatusValues = ['pending', 'completed', 'failed'] as const;
export type TransactionStatus = (typeof transactionStatusValues)[number];

export const orders = pgTable('orders', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  courseId: bigint('course_id', { mode: 'number' })
    .notNull()
    .references(() => courses.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency', { enum: ['BOB', 'USD'] }).notNull(),
  status: text('status', { enum: orderStatusValues }).notNull().default('pending'),
  confirmedBy: bigint('confirmed_by', { mode: 'number' }).references(() => users.id),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  receiptUrl: text('receipt_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  orderId: bigint('order_id', { mode: 'number' })
    .notNull()
    .references(() => orders.id),
  provider: text('provider', { enum: transactionProviderValues }).notNull(),
  providerReference: text('provider_reference'),
  status: text('status', { enum: transactionStatusValues }).notNull().default('pending'),
  rawResponse: jsonb('raw_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
