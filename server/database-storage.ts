import { 
  users, type User, type InsertUser,
  deals, type Deal, type InsertDeal,
  timelineEvents, type TimelineEvent, type InsertTimelineEvent,
  dealStars, type DealStar, type InsertDealStar,
  miniMemos, type MiniMemo, type InsertMiniMemo,
  funds, type Fund, type InsertFund,
  fundAllocations, type FundAllocation, type InsertFundAllocation,
  dealAssignments, type DealAssignment, type InsertDealAssignment
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  // Deal operations
  async createDeal(deal: InsertDeal): Promise<Deal> {
    const [newDeal] = await db.insert(deals).values(deal).returning();
    return newDeal;
  }

  async getDeal(id: number): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal;
  }

  async getDeals(): Promise<Deal[]> {
    return db.select().from(deals).orderBy(desc(deals.createdAt));
  }

  async getDealsByStage(stage: Deal['stage']): Promise<Deal[]> {
    return db.select().from(deals).where(eq(deals.stage, stage)).orderBy(desc(deals.createdAt));
  }

  async updateDeal(id: number, dealUpdate: Partial<InsertDeal>): Promise<Deal | undefined> {
    const [updatedDeal] = await db
      .update(deals)
      .set({ ...dealUpdate, updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();
    return updatedDeal;
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
    return db
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.dealId, dealId))
      .orderBy(desc(timelineEvents.createdAt));
  }
  
  // Deal stars (leaderboard)
  async starDeal(starData: InsertDealStar): Promise<DealStar> {
    const [existingStar] = await db
      .select()
      .from(dealStars)
      .where(
        and(
          eq(dealStars.dealId, starData.dealId),
          eq(dealStars.userId, starData.userId)
        )
      );
      
    // If star already exists, return it
    if (existingStar) {
      return existingStar;
    }
    
    const [newStar] = await db.insert(dealStars).values(starData).returning();
    return newStar;
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
    return db
      .select()
      .from(dealStars)
      .where(eq(dealStars.dealId, dealId))
      .orderBy(desc(dealStars.createdAt));
  }

  async getUserStars(userId: number): Promise<DealStar[]> {
    return db
      .select()
      .from(dealStars)
      .where(eq(dealStars.userId, userId))
      .orderBy(desc(dealStars.createdAt));
  }
  
  // Mini memos
  async createMiniMemo(memo: InsertMiniMemo): Promise<MiniMemo> {
    const [newMemo] = await db.insert(miniMemos).values(memo).returning();
    return newMemo;
  }

  async getMiniMemo(id: number): Promise<MiniMemo | undefined> {
    const [memo] = await db.select().from(miniMemos).where(eq(miniMemos.id, id));
    return memo;
  }

  async getMiniMemosByDeal(dealId: number): Promise<MiniMemo[]> {
    return db
      .select()
      .from(miniMemos)
      .where(eq(miniMemos.dealId, dealId))
      .orderBy(desc(miniMemos.createdAt));
  }

  async updateMiniMemo(id: number, memoUpdate: Partial<InsertMiniMemo>): Promise<MiniMemo | undefined> {
    const [updatedMemo] = await db
      .update(miniMemos)
      .set({ ...memoUpdate, updatedAt: new Date() })
      .where(eq(miniMemos.id, id))
      .returning();
    return updatedMemo;
  }
  
  // Funds
  async createFund(fund: InsertFund): Promise<Fund> {
    const [newFund] = await db.insert(funds).values(fund).returning();
    return newFund;
  }

  async getFund(id: number): Promise<Fund | undefined> {
    const [fund] = await db.select().from(funds).where(eq(funds.id, id));
    return fund;
  }

  async getFunds(): Promise<Fund[]> {
    return db.select().from(funds).orderBy(desc(funds.createdAt));
  }

  async updateFund(id: number, fundUpdate: Partial<InsertFund>): Promise<Fund | undefined> {
    const [updatedFund] = await db
      .update(funds)
      .set(fundUpdate)
      .where(eq(funds.id, id))
      .returning();
    return updatedFund;
  }
  
  // Fund allocations
  async createFundAllocation(allocation: InsertFundAllocation): Promise<FundAllocation> {
    const [newAllocation] = await db.insert(fundAllocations).values(allocation).returning();
    return newAllocation;
  }

  async getAllocationsByFund(fundId: number): Promise<FundAllocation[]> {
    return db
      .select()
      .from(fundAllocations)
      .where(eq(fundAllocations.fundId, fundId));
  }

  async getAllocationsByDeal(dealId: number): Promise<FundAllocation[]> {
    return db
      .select()
      .from(fundAllocations)
      .where(eq(fundAllocations.dealId, dealId));
  }
  
  // Deal assignments
  async assignUserToDeal(assignment: InsertDealAssignment): Promise<DealAssignment> {
    const [existingAssignment] = await db
      .select()
      .from(dealAssignments)
      .where(
        and(
          eq(dealAssignments.dealId, assignment.dealId),
          eq(dealAssignments.userId, assignment.userId)
        )
      );
      
    // If assignment already exists, return it
    if (existingAssignment) {
      return existingAssignment;
    }
    
    const [newAssignment] = await db.insert(dealAssignments).values(assignment).returning();
    return newAssignment;
  }

  async getDealAssignments(dealId: number): Promise<DealAssignment[]> {
    return db
      .select()
      .from(dealAssignments)
      .where(eq(dealAssignments.dealId, dealId))
      .orderBy(desc(dealAssignments.createdAt));
  }

  async getUserAssignments(userId: number): Promise<DealAssignment[]> {
    return db
      .select()
      .from(dealAssignments)
      .where(eq(dealAssignments.userId, userId))
      .orderBy(desc(dealAssignments.createdAt));
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
}