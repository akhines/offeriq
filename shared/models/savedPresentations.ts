import { sql } from "drizzle-orm";
import { pgTable, varchar, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

export const savedPresentations = pgTable("saved_presentations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  propertyAddress: text("property_address").notNull(),
  pdfPath: text("pdf_path").notNull(),
  presentationData: jsonb("presentation_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSavedPresentationSchema = createInsertSchema(savedPresentations).omit({
  id: true,
  createdAt: true,
});

export type SavedPresentationRecord = typeof savedPresentations.$inferSelect;
export type InsertSavedPresentation = z.infer<typeof insertSavedPresentationSchema>;
