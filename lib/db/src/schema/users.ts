import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  promptsUsed: integer("prompts_used").default(0).notNull(),
  promptsLimit: integer("prompts_limit").default(10).notNull(),
  plan: text("plan").default("free").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
