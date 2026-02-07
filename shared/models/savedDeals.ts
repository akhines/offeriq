import { sql } from "drizzle-orm";
import { pgTable, varchar, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

export const savedDeals = pgTable("saved_deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  propertyAddress: text("property_address").notNull(),
  dealName: text("deal_name"),
  interviewAnswers: jsonb("interview_answers"),
  underwritingData: jsonb("underwriting_data"),
  offerData: jsonb("offer_data"),
  compsData: jsonb("comps_data"),
  userComps: jsonb("user_comps"),
  presentationData: jsonb("presentation_data"),
  dealGrade: varchar("deal_grade", { length: 2 }),
  sellerOffer: integer("seller_offer"),
  arv: integer("arv"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSavedDealSchema = createInsertSchema(savedDeals).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type SavedDeal = typeof savedDeals.$inferSelect;
export type InsertSavedDeal = z.infer<typeof insertSavedDealSchema>;
