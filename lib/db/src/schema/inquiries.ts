import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  company: text("company"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = typeof inquiries.$inferInsert;
