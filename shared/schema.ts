import { pgTable, text, serial, integer, boolean, jsonb, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  initials: text("initials").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["admin", "partner", "analyst", "observer"] }).notNull().default("analyst"),
  avatarColor: text("avatar_color").default("#0E4DA4"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

// Deal model
export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  industry: text("industry").notNull(),
  stage: text("stage", { 
    enum: ["initial_review", "screening", "due_diligence", "ic_review", "closing", "closed", "passed"]
  }).notNull().default("initial_review"),
  round: text("round").notNull(),
  targetRaise: text("target_raise"),
  valuation: text("valuation"),
  leadInvestor: text("lead_investor"),
  contactEmail: text("contact_email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
});

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Timeline events for deals
export const timelineEvents = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  eventType: text("event_type", { 
    enum: ["note", "stage_change", "document_upload", "memo_added", "star_added", "ai_analysis"]
  }).notNull(),
  content: text("content"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
});

export const insertTimelineEventSchema = createInsertSchema(timelineEvents).omit({
  id: true,
  createdAt: true,
});

// Deal stars (for leaderboard)
export const dealStars = pgTable("deal_stars", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDealStarSchema = createInsertSchema(dealStars).omit({
  id: true,
  createdAt: true,
});

// Mini memos (for deal evaluation)
export const miniMemos = pgTable("mini_memos", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  userId: integer("user_id").notNull(),
  thesis: text("thesis").notNull(),
  risksAndMitigations: text("risks_and_mitigations"),
  pricingConsideration: text("pricing_consideration"),
  score: integer("score").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMiniMemoSchema = createInsertSchema(miniMemos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Funds
export const funds = pgTable("funds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  aum: real("aum").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFundSchema = createInsertSchema(funds).omit({
  id: true,
  createdAt: true,
});

// Fund allocations (deals allocated to funds)
export const fundAllocations = pgTable("fund_allocations", {
  id: serial("id").primaryKey(),
  fundId: integer("fund_id").notNull(),
  dealId: integer("deal_id").notNull(),
  amount: real("amount").notNull(),
  securityType: text("security_type").notNull(),
  allocationDate: timestamp("allocation_date").notNull().defaultNow(),
  notes: text("notes"),
});

export const insertFundAllocationSchema = createInsertSchema(fundAllocations).omit({
  id: true,
});

// User assignments to deals
export const dealAssignments = pgTable("deal_assignments", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDealAssignmentSchema = createInsertSchema(dealAssignments).omit({
  id: true,
  createdAt: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;

export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;

export type DealStar = typeof dealStars.$inferSelect;
export type InsertDealStar = z.infer<typeof insertDealStarSchema>;

export type MiniMemo = typeof miniMemos.$inferSelect;
export type InsertMiniMemo = z.infer<typeof insertMiniMemoSchema>;

export type Fund = typeof funds.$inferSelect;
export type InsertFund = z.infer<typeof insertFundSchema>;

export type FundAllocation = typeof fundAllocations.$inferSelect;
export type InsertFundAllocation = z.infer<typeof insertFundAllocationSchema>;

export type DealAssignment = typeof dealAssignments.$inferSelect;
export type InsertDealAssignment = z.infer<typeof insertDealAssignmentSchema>;

// Helper enum for stages display
export const DealStageLabels: Record<Deal['stage'], string> = {
  initial_review: "Initial Review",
  screening: "Screening",
  due_diligence: "Due Diligence",
  ic_review: "IC Review",
  closing: "Closing",
  closed: "Closed",
  passed: "Passed"
};

// Helper for stage colors
export const DealStageColors: Record<Deal['stage'], string> = {
  initial_review: "neutral",
  screening: "neutral",
  due_diligence: "primary",
  ic_review: "info",
  closing: "success",
  closed: "success",
  passed: "danger"
};
