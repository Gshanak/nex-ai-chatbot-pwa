import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';
export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  owner: text('owner').notNull(),
  title: text('title').notNull(),
  model: text('model').notNull(),
  messages: jsonb('messages').$type<ChatMessage[]>().notNull().default([]),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
