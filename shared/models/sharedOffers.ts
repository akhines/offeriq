import { sql } from "drizzle-orm";
import { pgTable, varchar, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

export const sharedOffers = pgTable("shared_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 10 }).notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  propertyAddress: text("property_address").notNull(),
  sections: jsonb("sections").notNull().$type<string[]>(),
  dealSnapshot: jsonb("deal_snapshot").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSharedOfferSchema = createInsertSchema(sharedOffers).omit({
  id: true,
  createdAt: true,
});

export type SharedOffer = typeof sharedOffers.$inferSelect;
export type InsertSharedOffer = z.infer<typeof insertSharedOfferSchema>;
