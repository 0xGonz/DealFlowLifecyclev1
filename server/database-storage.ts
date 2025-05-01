import { db } from './db';
if (!db) {
  throw new Error('Database client not initialized');
}
import { IStorage } from './storage';
import {
  User, InsertUser,
  Deal, InsertDeal,
  TimelineEvent, InsertTimelineEvent,
  DealStar, InsertDealStar,
  MiniMemo, InsertMiniMemo,
  Document, InsertDocument,
  Fund, InsertFund,
  FundAllocation, InsertFundAllocation,
  DealAssignment, InsertDealAssignment,
  Notification, InsertNotification,
  users, deals, timelineEvents, dealStars, miniMemos, documents,
  funds, fundAllocations, dealAssignments, notifications
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * PostgreSQL database implementation of the storage interface
 */
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  // Deal operations
  async createDeal(deal: InsertDeal): Promise<Deal> {
    const [newDeal] = await db.insert(deals).values(deal).returning();
    return newDeal;
  }
  
  async getDeal(id: number): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal || undefined;
  }
  
  async getDeals(): Promise<Deal[]> {
    return await db.select().from(deals);
  }
  
  async getDealsByStage(stage: Deal['stage']): Promise<Deal[]> {
    return await db.select().from(deals).where(eq(deals.stage, stage));
  }
  
  async updateDeal(id: number, dealUpdate: Partial<InsertDeal>): Promise<Deal | undefined> {
    const [updatedDeal] = await db
      .update(deals)
      .set(dealUpdate)
      .where(eq(deals.id, id))
      .returning();
    return updatedDeal || undefined;
  }
  
  async deleteDeal(id: number): Promise<boolean> {
    const result = await db.delete(deals).where(eq(deals.id, id));
    return !!result;
  }
  
  // Timeline events
  async createTimelineEvent(event: InsertTimelineEvent): Promise<TimelineEvent> {
    const [newEvent] = await db.insert(timelineEvents).values(event).returning();
    return newEvent;
  }
  
  async getTimelineEventsByDeal(dealId: number): Promise<TimelineEvent[]> {
    return await db
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.dealId, dealId));
  }
  
  // Deal stars
  async starDeal(starData: InsertDealStar): Promise<DealStar> {
    const [star] = await db.insert(dealStars).values(starData).returning();
    return star;
  }
  
  async unstarDeal(dealId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(dealStars)
      .where(
        and(
          eq(dealStars.dealId, dealId),
          eq(dealStars.userId, userId)
        )
      );
    return !!result;
  }
  
  async getDealStars(dealId: number): Promise<DealStar[]> {
    return await db
      .select()
      .from(dealStars)
      .where(eq(dealStars.dealId, dealId));
  }
  
  async getUserStars(userId: number): Promise<DealStar[]> {
    return await db
      .select()
      .from(dealStars)
      .where(eq(dealStars.userId, userId));
  }
  
  // Mini memos
  async createMiniMemo(memo: InsertMiniMemo): Promise<MiniMemo> {
    const [newMemo] = await db.insert(miniMemos).values(memo).returning();
    return newMemo;
  }
  
  async getMiniMemo(id: number): Promise<MiniMemo | undefined> {
    const [memo] = await db.select().from(miniMemos).where(eq(miniMemos.id, id));
    return memo || undefined;
  }
  
  async getMiniMemosByDeal(dealId: number): Promise<MiniMemo[]> {
    return await db
      .select()
      .from(miniMemos)
      .where(eq(miniMemos.dealId, dealId));
  }
  
  async updateMiniMemo(id: number, memoUpdate: Partial<InsertMiniMemo>): Promise<MiniMemo | undefined> {
    const [updatedMemo] = await db
      .update(miniMemos)
      .set(memoUpdate)
      .where(eq(miniMemos.id, id))
      .returning();
    return updatedMemo || undefined;
  }
  
  // Documents
  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }
  
  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }
  
  async getDocumentsByDeal(dealId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.dealId, dealId));
  }
  
  async getDocumentsByType(dealId: number, documentType: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.dealId, dealId),
          eq(documents.documentType, documentType)
        )
      );
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return !!result;
  }
  
  // Funds
  async createFund(fund: InsertFund): Promise<Fund> {
    const [newFund] = await db.insert(funds).values(fund).returning();
    return newFund;
  }
  
  async getFund(id: number): Promise<Fund | undefined> {
    const [fund] = await db.select().from(funds).where(eq(funds.id, id));
    return fund || undefined;
  }
  
  async getFunds(): Promise<Fund[]> {
    return await db.select().from(funds);
  }
  
  async updateFund(id: number, fundUpdate: Partial<InsertFund>): Promise<Fund | undefined> {
    const [updatedFund] = await db
      .update(funds)
      .set(fundUpdate)
      .where(eq(funds.id, id))
      .returning();
    return updatedFund || undefined;
  }
  
  // Fund allocations
  async createFundAllocation(allocation: InsertFundAllocation): Promise<FundAllocation> {
    const [newAllocation] = await db.insert(fundAllocations).values(allocation).returning();
    return newAllocation;
  }
  
  async getAllocationsByFund(fundId: number): Promise<FundAllocation[]> {
    return await db
      .select()
      .from(fundAllocations)
      .where(eq(fundAllocations.fundId, fundId));
  }
  
  async getAllocationsByDeal(dealId: number): Promise<FundAllocation[]> {
    return await db
      .select()
      .from(fundAllocations)
      .where(eq(fundAllocations.dealId, dealId));
  }
  
  // Deal assignments
  async assignUserToDeal(assignment: InsertDealAssignment): Promise<DealAssignment> {
    const [newAssignment] = await db.insert(dealAssignments).values(assignment).returning();
    return newAssignment;
  }
  
  async getDealAssignments(dealId: number): Promise<DealAssignment[]> {
    return await db
      .select()
      .from(dealAssignments)
      .where(eq(dealAssignments.dealId, dealId));
  }
  
  async getUserAssignments(userId: number): Promise<DealAssignment[]> {
    return await db
      .select()
      .from(dealAssignments)
      .where(eq(dealAssignments.userId, userId));
  }
  
  async unassignUserFromDeal(dealId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(dealAssignments)
      .where(
        and(
          eq(dealAssignments.dealId, dealId),
          eq(dealAssignments.userId, userId)
        )
      );
    return !!result;
  }
  
  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }
  
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId));
  }
  
  async getUnreadNotificationsCount(userId: number): Promise<number> {
    const unreadNotifications = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    return unreadNotifications.length;
  }
  
  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    return !!result;
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
    return !!result;
  }
}
