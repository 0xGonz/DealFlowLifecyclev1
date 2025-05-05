import { 
  User, InsertUser, 
  Deal, InsertDeal, 
  TimelineEvent, InsertTimelineEvent,
  DealStar, InsertDealStar,
  MiniMemo, InsertMiniMemo,
  Fund, InsertFund,
  FundAllocation, InsertFundAllocation,
  DealAssignment, InsertDealAssignment,
  Notification, InsertNotification,
  Document, InsertDocument,
  MemoComment, InsertMemoComment,
  CapitalCall, InsertCapitalCall
} from "@shared/schema";

// This file defines the storage interface and in-memory implementation
// For database storage, see database-storage.ts
// For factory pattern to choose storage type, see storage-factory.ts

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  getUsers(): Promise<User[]>;

  // Deal operations
  createDeal(deal: InsertDeal): Promise<Deal>;
  getDeal(id: number): Promise<Deal | undefined>;
  getDeals(): Promise<Deal[]>;
  getDealsByStage(stage: Deal['stage']): Promise<Deal[]>;
  updateDeal(id: number, deal: Partial<InsertDeal>): Promise<Deal | undefined>;
  deleteDeal(id: number): Promise<boolean>;

  // Timeline events
  createTimelineEvent(event: InsertTimelineEvent): Promise<TimelineEvent>;
  getTimelineEventsByDeal(dealId: number): Promise<TimelineEvent[]>;
  updateTimelineEvent(id: number, update: Partial<InsertTimelineEvent>): Promise<TimelineEvent | undefined>;
  deleteTimelineEvent(id: number): Promise<boolean>;
  
  // Deal stars (leaderboard)
  starDeal(dealStar: InsertDealStar): Promise<DealStar>;
  unstarDeal(dealId: number, userId: number): Promise<boolean>;
  getDealStars(dealId: number): Promise<DealStar[]>;
  getUserStars(userId: number): Promise<DealStar[]>;
  
  // Mini memos
  createMiniMemo(memo: InsertMiniMemo): Promise<MiniMemo>;
  getMiniMemo(id: number): Promise<MiniMemo | undefined>;
  getMiniMemosByDeal(dealId: number): Promise<MiniMemo[]>;
  updateMiniMemo(id: number, memo: Partial<InsertMiniMemo>): Promise<MiniMemo | undefined>;
  
  // Documents
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByDeal(dealId: number): Promise<Document[]>;
  getDocumentsByType(dealId: number, documentType: string): Promise<Document[]>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Funds
  createFund(fund: InsertFund): Promise<Fund>;
  getFund(id: number): Promise<Fund | undefined>;
  getFunds(): Promise<Fund[]>;
  updateFund(id: number, fund: Partial<InsertFund>): Promise<Fund | undefined>;
  
  // Fund allocations
  createFundAllocation(allocation: InsertFundAllocation): Promise<FundAllocation>;
  getAllocationsByFund(fundId: number): Promise<FundAllocation[]>;
  getAllocationsByDeal(dealId: number): Promise<FundAllocation[]>;
  getFundAllocation(id: number): Promise<FundAllocation | undefined>;
  deleteFundAllocation(id: number): Promise<boolean>;
  
  // Capital Calls
  createCapitalCall(capitalCall: InsertCapitalCall): Promise<CapitalCall>;
  getCapitalCall(id: number): Promise<CapitalCall | undefined>;
  getAllCapitalCalls(): Promise<CapitalCall[]>;
  getCapitalCallsByAllocation(allocationId: number): Promise<CapitalCall[]>;
  getCapitalCallsByDeal(dealId: number): Promise<CapitalCall[]>;
  updateCapitalCallStatus(id: number, status: CapitalCall['status'], paidAmount?: number): Promise<CapitalCall | undefined>;
  
  // Deal assignments
  assignUserToDeal(assignment: InsertDealAssignment): Promise<DealAssignment>;
  getDealAssignments(dealId: number): Promise<DealAssignment[]>;
  getUserAssignments(userId: number): Promise<DealAssignment[]>;
  unassignUserFromDeal(dealId: number, userId: number): Promise<boolean>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  getUnreadNotificationsCount(userId: number): Promise<number>;
  markNotificationAsRead(id: number): Promise<boolean>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  
  // Memo Comments
  createMemoComment(comment: InsertMemoComment): Promise<MemoComment>;
  getMemoComments(memoId: number): Promise<MemoComment[]>;
  getMemoCommentsByDeal(dealId: number): Promise<MemoComment[]>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private deals: Map<number, Deal>;
  private timelineEvents: Map<number, TimelineEvent>;
  private dealStars: Map<number, DealStar>;
  private miniMemos: Map<number, MiniMemo>;
  private documents: Map<number, Document>;
  private funds: Map<number, Fund>;
  private fundAllocations: Map<number, FundAllocation>;
  private dealAssignments: Map<number, DealAssignment>;
  private notifications: Map<number, Notification>;
  private memoComments: Map<number, MemoComment>;
  private capitalCalls: Map<number, CapitalCall>;
  
  private userIdCounter: number;
  private dealIdCounter: number;
  private eventIdCounter: number;
  private starIdCounter: number;
  private memoIdCounter: number;
  private documentIdCounter: number;
  private fundIdCounter: number;
  private allocationIdCounter: number;
  private assignmentIdCounter: number;
  private notificationIdCounter: number;
  private commentIdCounter: number;
  private capitalCallIdCounter: number;

  constructor() {
    this.users = new Map();
    this.deals = new Map();
    this.timelineEvents = new Map();
    this.dealStars = new Map();
    this.miniMemos = new Map();
    this.documents = new Map();
    this.funds = new Map();
    this.fundAllocations = new Map();
    this.dealAssignments = new Map();
    this.notifications = new Map();
    this.memoComments = new Map();
    this.capitalCalls = new Map();
    
    this.userIdCounter = 1;
    this.dealIdCounter = 1;
    this.eventIdCounter = 1;
    this.starIdCounter = 1;
    this.memoIdCounter = 1;
    this.documentIdCounter = 1;
    this.fundIdCounter = 1;
    this.allocationIdCounter = 1;
    this.assignmentIdCounter = 1;
    this.notificationIdCounter = 1;
    this.commentIdCounter = 1;
    this.capitalCallIdCounter = 1;
    
    // Initialize with some sample data
    this.initSampleData();
  }

  private initSampleData() {
    // Create admin user
    this.createUser({
      username: 'admin',
      password: 'admin123',
      fullName: 'Admin User',
      initials: 'AD',
      email: 'admin@doliver.com',
      role: 'admin',
      avatarColor: '#0E4DA4'
    });
    
    // Create partner user
    this.createUser({
      username: 'john',
      password: 'partner123',
      fullName: 'John Doe',
      initials: 'JD',
      email: 'john@doliver.com',
      role: 'partner',
      avatarColor: '#0E4DA4'
    });
    
    // Create analyst user
    this.createUser({
      username: 'laura',
      password: 'analyst123',
      fullName: 'Laura Richards',
      initials: 'LR',
      email: 'laura@doliver.com',
      role: 'analyst',
      avatarColor: '#FF6B35'
    });
    
    // Create observer user
    this.createUser({
      username: 'observer',
      password: 'observer123',
      fullName: 'Tom Smith',
      initials: 'TS',
      email: 'tom@doliver.com',
      role: 'observer',
      avatarColor: '#2D87BB'
    });
    
    // Create sample funds
    const fund1 = this.createUser({
      username: 'fund1',
      password: 'password', // In a real app, this would be hashed
      fullName: 'Fund Manager',
      initials: 'FM',
      email: 'fund@example.com',
      role: 'partner',
      avatarColor: '#28A745'
    });
    
    // Create a few sample deals
    const deal1 = this.createDeal({
      name: 'TechFusion AI',
      description: 'AI-powered enterprise solutions for manufacturing optimization',
      sector: 'Technology',
      stage: 'diligence',
      round: 'Series B',
      targetRaise: '$25M',
      valuation: '$150M valuation',
      leadInvestor: 'Acme Ventures',
      contactEmail: 'contact@techfusion.ai',
      notes: 'Promising AI technology with strong team and traction',
      createdBy: 2, // John Doe
      tags: ['AI', 'Enterprise', 'Manufacturing']
    });
    
    const deal2 = this.createDeal({
      name: 'GreenScale Renewables',
      description: 'Modular solar integration platform for commercial buildings',
      sector: 'Renewable Energy',
      stage: 'ic_review',
      round: 'Series A',
      targetRaise: '$12M',
      valuation: '$45M valuation',
      leadInvestor: 'Green Capital',
      contactEmail: 'info@greenscale.co',
      notes: 'Innovative renewable energy solution with growing market share',
      createdBy: 3, // Laura Richards
      tags: ['Solar', 'Renewable', 'Commercial']
    });
    
    const deal3 = this.createDeal({
      name: 'QuantumEdge Computing',
      description: 'Quantum computing infrastructure for financial services',
      sector: 'Technology',
      stage: 'screening',
      round: 'Seed Extension',
      targetRaise: '$5M',
      valuation: '$22M valuation',
      leadInvestor: 'Frontier Tech Ventures',
      contactEmail: 'hello@quantumedge.io',
      notes: 'Early-stage quantum computing platform with promising applications',
      createdBy: 2, // John Doe
      tags: ['Quantum', 'FinTech', 'Infrastructure']
    });
    
    // Create timeline events for deals
    this.createTimelineEvent({
      dealId: 1,
      eventType: 'stage_change',
      content: 'Deal moved from Screening to Diligence',
      createdBy: 2,
      metadata: { prevStage: 'screening', newStage: 'diligence' }
    });
    
    this.createTimelineEvent({
      dealId: 1,
      eventType: 'note',
      content: 'Team demonstrated impressive tech capabilities during initial meeting.',
      createdBy: 2,
      metadata: {}
    });
    
    this.createTimelineEvent({
      dealId: 2,
      eventType: 'stage_change',
      content: 'Deal moved from Diligence to IC Review',
      createdBy: 3,
      metadata: { prevStage: 'diligence', newStage: 'ic_review' }
    });
    
    this.createTimelineEvent({
      dealId: 2,
      eventType: 'memo_added',
      content: 'Added Mini-Memo with thesis and pricing considerations.',
      createdBy: 2,
      metadata: { memoId: 1 }
    });
    
    // Add stars to deals
    this.starDeal({ dealId: 1, userId: 2 });
    this.starDeal({ dealId: 1, userId: 3 });
    this.starDeal({ dealId: 1, userId: 4 });
    this.starDeal({ dealId: 2, userId: 2 });
    this.starDeal({ dealId: 2, userId: 3 });
    this.starDeal({ dealId: 2, userId: 4 });
    this.starDeal({ dealId: 2, userId: 1 });
    
    // Add mini memos
    this.createMiniMemo({
      dealId: 1,
      userId: 2,
      thesis: 'Strong technology with clear market fit. The team has deep expertise in AI and manufacturing.',
      risksAndMitigations: 'Competition from established players; mitigated by proprietary algorithms and patents.',
      pricingConsideration: 'Valuation in line with comparable companies. Growth trajectory supports the price.',
      score: 87
    });
    
    this.createMiniMemo({
      dealId: 2,
      userId: 3,
      thesis: 'Revolutionary approach to solar integration with scalable business model.',
      risksAndMitigations: 'Supply chain dependencies; mitigated by multiple supplier relationships.',
      pricingConsideration: 'Attractive entry valuation with significant room for expansion.',
      score: 94
    });
    
    // Create fund
    const fund = this.createFund({
      name: 'Doliver Fund III',
      description: 'Growth-focused fund targeting Series A and B investments',
      aum: 127400000 // $127.4M
    });
    
    // Assign users to deals
    this.assignUserToDeal({ dealId: 1, userId: 2 });
    this.assignUserToDeal({ dealId: 1, userId: 3 });
    this.assignUserToDeal({ dealId: 1, userId: 4 });
    this.assignUserToDeal({ dealId: 2, userId: 3 });
    this.assignUserToDeal({ dealId: 2, userId: 4 });
    this.assignUserToDeal({ dealId: 3, userId: 2 });
    
    // Create sample notifications
    this.createNotification({
      userId: 1, // Admin user
      title: 'New deal added',
      message: 'TechFusion AI was added to the pipeline',
      type: 'deal',
      relatedId: 1,
      isRead: false
    });
    
    this.createNotification({
      userId: 1, // Admin user
      title: 'Deal moved to diligence',
      message: 'TechFusion AI deal moved to diligence stage',
      type: 'deal',
      relatedId: 1,
      isRead: false
    });
    
    this.createNotification({
      userId: 1, // Admin user
      title: 'You were assigned to a deal',
      message: 'You were assigned to the GreenScale Renewables deal',
      type: 'assignment',
      relatedId: 2,
      isRead: true
    });
    
    this.createNotification({
      userId: 1, // Admin user
      title: 'New memo added',
      message: 'A new memo was added to QuantumEdge Computing deal',
      type: 'memo',
      relatedId: 3,
      isRead: false
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: number, userUpdate: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser = {
      ...existingUser,
      ...userUpdate,
    };
    
    this.users.set(id, updatedUser);
    
    // If timeline events exist with this user, update them automatically
    for (const [eventId, event] of this.timelineEvents.entries()) {
      if (event.createdBy === id) {
        // Just updating the timeline events is sufficient - no need to return them
        this.timelineEvents.set(eventId, {
          ...event
        });
      }
    }
    
    return updatedUser;
  }

  // Deal operations
  async createDeal(deal: InsertDeal): Promise<Deal> {
    const id = this.dealIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const newDeal: Deal = { ...deal, id, createdAt, updatedAt };
    this.deals.set(id, newDeal);
    
    // Create initial timeline event
    await this.createTimelineEvent({
      dealId: id,
      eventType: 'stage_change',
      content: `Deal created and set to ${deal.stage === 'initial_review' ? 'Initial Review' : 'Screening'}`,
      createdBy: deal.createdBy,
      metadata: { initialStage: deal.stage }
    });
    
    return newDeal;
  }
  
  async getDeal(id: number): Promise<Deal | undefined> {
    return this.deals.get(id);
  }
  
  async getDeals(): Promise<Deal[]> {
    return Array.from(this.deals.values());
  }
  
  async getDealsByStage(stage: Deal['stage']): Promise<Deal[]> {
    return Array.from(this.deals.values()).filter(deal => deal.stage === stage);
  }
  
  async updateDeal(id: number, dealUpdate: Partial<InsertDeal>): Promise<Deal | undefined> {
    const deal = this.deals.get(id);
    if (!deal) return undefined;
    
    // If stage is changing, create a timeline event
    if (dealUpdate.stage && dealUpdate.stage !== deal.stage) {
      await this.createTimelineEvent({
        dealId: id,
        eventType: 'stage_change',
        content: `Deal moved from ${deal.stage} to ${dealUpdate.stage}`,
        createdBy: dealUpdate.createdBy || deal.createdBy,
        metadata: { prevStage: deal.stage, newStage: dealUpdate.stage }
      });
    }
    
    const updatedDeal: Deal = {
      ...deal,
      ...dealUpdate,
      updatedAt: new Date()
    };
    this.deals.set(id, updatedDeal);
    return updatedDeal;
  }
  
  async deleteDeal(id: number): Promise<boolean> {
    return this.deals.delete(id);
  }
  
  // Timeline events
  async createTimelineEvent(event: InsertTimelineEvent): Promise<TimelineEvent> {
    const id = this.eventIdCounter++;
    const createdAt = new Date();
    const newEvent: TimelineEvent = { ...event, id, createdAt };
    this.timelineEvents.set(id, newEvent);
    return newEvent;
  }
  
  async getTimelineEventsByDeal(dealId: number): Promise<TimelineEvent[]> {
    return Array.from(this.timelineEvents.values())
      .filter(event => event.dealId === dealId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async updateTimelineEvent(id: number, update: Partial<InsertTimelineEvent>): Promise<TimelineEvent | undefined> {
    const event = this.timelineEvents.get(id);
    if (!event) return undefined;
    
    const updatedEvent: TimelineEvent = {
      ...event,
      ...update
    };
    this.timelineEvents.set(id, updatedEvent);
    return updatedEvent;
  }
  
  async deleteTimelineEvent(id: number): Promise<boolean> {
    return this.timelineEvents.delete(id);
  }
  
  // Deal stars
  async starDeal(starData: InsertDealStar): Promise<DealStar> {
    // Check if already starred
    const existing = Array.from(this.dealStars.values()).find(
      star => star.dealId === starData.dealId && star.userId === starData.userId
    );
    
    if (existing) return existing;
    
    const id = this.starIdCounter++;
    const createdAt = new Date();
    const newStar: DealStar = { ...starData, id, createdAt };
    this.dealStars.set(id, newStar);
    
    // Create timeline event
    await this.createTimelineEvent({
      dealId: starData.dealId,
      eventType: 'star_added',
      content: `Deal starred by user ${starData.userId}`,
      createdBy: starData.userId,
      metadata: { starId: id }
    });
    
    return newStar;
  }
  
  async unstarDeal(dealId: number, userId: number): Promise<boolean> {
    const star = Array.from(this.dealStars.values()).find(
      s => s.dealId === dealId && s.userId === userId
    );
    
    if (!star) return false;
    return this.dealStars.delete(star.id);
  }
  
  async getDealStars(dealId: number): Promise<DealStar[]> {
    return Array.from(this.dealStars.values()).filter(star => star.dealId === dealId);
  }
  
  async getUserStars(userId: number): Promise<DealStar[]> {
    return Array.from(this.dealStars.values()).filter(star => star.userId === userId);
  }
  
  // Mini memos
  async createMiniMemo(memo: InsertMiniMemo): Promise<MiniMemo> {
    const id = this.memoIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const newMemo: MiniMemo = { ...memo, id, createdAt, updatedAt };
    this.miniMemos.set(id, newMemo);
    
    // Create timeline event
    await this.createTimelineEvent({
      dealId: memo.dealId,
      eventType: 'memo_added',
      content: `Mini-Memo added by user ${memo.userId}`,
      createdBy: memo.userId,
      metadata: { memoId: id }
    });
    
    return newMemo;
  }
  
  async getMiniMemo(id: number): Promise<MiniMemo | undefined> {
    return this.miniMemos.get(id);
  }
  
  async getMiniMemosByDeal(dealId: number): Promise<MiniMemo[]> {
    return Array.from(this.miniMemos.values()).filter(memo => memo.dealId === dealId);
  }
  
  async updateMiniMemo(id: number, memoUpdate: Partial<InsertMiniMemo>): Promise<MiniMemo | undefined> {
    const memo = this.miniMemos.get(id);
    if (!memo) return undefined;
    
    const updatedMemo: MiniMemo = {
      ...memo,
      ...memoUpdate,
      updatedAt: new Date()
    };
    this.miniMemos.set(id, updatedMemo);
    return updatedMemo;
  }
  
  // Document operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const uploadedAt = new Date();
    const newDocument: Document = { ...document, id, uploadedAt };
    this.documents.set(id, newDocument);
    
    // Create a timeline event for document upload
    await this.createTimelineEvent({
      dealId: document.dealId,
      eventType: 'document_upload',
      content: `New document uploaded: ${document.fileName}`,
      createdBy: document.uploadedBy,
      metadata: { documentId: id, documentType: document.documentType }
    });
    
    return newDocument;
  }
  
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }
  
  async getDocumentsByDeal(dealId: number): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(doc => doc.dealId === dealId)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }
  
  async getDocumentsByType(dealId: number, documentType: string): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(doc => doc.dealId === dealId && doc.documentType === documentType)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }
  
  // Funds
  async createFund(fund: InsertFund): Promise<Fund> {
    const id = this.fundIdCounter++;
    const createdAt = new Date();
    const newFund: Fund = { ...fund, id, createdAt };
    this.funds.set(id, newFund);
    return newFund;
  }
  
  async getFund(id: number): Promise<Fund | undefined> {
    return this.funds.get(id);
  }
  
  async getFunds(): Promise<Fund[]> {
    return Array.from(this.funds.values());
  }
  
  async updateFund(id: number, fundUpdate: Partial<InsertFund>): Promise<Fund | undefined> {
    const fund = this.funds.get(id);
    if (!fund) return undefined;
    
    const updatedFund: Fund = {
      ...fund,
      ...fundUpdate,
    };
    this.funds.set(id, updatedFund);
    return updatedFund;
  }
  
  // Fund allocations
  async createFundAllocation(allocation: InsertFundAllocation): Promise<FundAllocation> {
    const id = this.allocationIdCounter++;
    const newAllocation: FundAllocation = { ...allocation, id };
    this.fundAllocations.set(id, newAllocation);
    
    // Update fund AUM
    const fund = await this.getFund(allocation.fundId);
    if (fund) {
      await this.updateFund(fund.id, { aum: fund.aum + allocation.amount });
    }
    
    return newAllocation;
  }
  
  async getAllocationsByFund(fundId: number): Promise<FundAllocation[]> {
    return Array.from(this.fundAllocations.values()).filter(alloc => alloc.fundId === fundId);
  }
  
  async getAllocationsByDeal(dealId: number): Promise<FundAllocation[]> {
    return Array.from(this.fundAllocations.values()).filter(alloc => alloc.dealId === dealId);
  }
  
  async deleteFundAllocation(id: number): Promise<boolean> {
    const allocation = this.fundAllocations.get(id);
    if (!allocation) return false;
    
    this.fundAllocations.delete(id);
    return true;
  }
  
  // Deal assignments
  async assignUserToDeal(assignment: InsertDealAssignment): Promise<DealAssignment> {
    // Check if already assigned
    const existing = Array.from(this.dealAssignments.values()).find(
      a => a.dealId === assignment.dealId && a.userId === assignment.userId
    );
    
    if (existing) return existing;
    
    const id = this.assignmentIdCounter++;
    const createdAt = new Date();
    const newAssignment: DealAssignment = { ...assignment, id, createdAt };
    this.dealAssignments.set(id, newAssignment);
    return newAssignment;
  }
  
  async getDealAssignments(dealId: number): Promise<DealAssignment[]> {
    return Array.from(this.dealAssignments.values()).filter(a => a.dealId === dealId);
  }
  
  async getUserAssignments(userId: number): Promise<DealAssignment[]> {
    return Array.from(this.dealAssignments.values()).filter(a => a.userId === userId);
  }
  
  async unassignUserFromDeal(dealId: number, userId: number): Promise<boolean> {
    const assignment = Array.from(this.dealAssignments.values()).find(
      a => a.dealId === dealId && a.userId === userId
    );
    
    if (!assignment) return false;
    return this.dealAssignments.delete(assignment.id);
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const createdAt = new Date();
    const newNotification: Notification = { ...notification, id, createdAt };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUnreadNotificationsCount(userId: number): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.isRead)
      .length;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    notification.isRead = true;
    this.notifications.set(id, notification);
    return true;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId);
    
    userNotifications.forEach(notification => {
      notification.isRead = true;
      this.notifications.set(notification.id, notification);
    });
    
    return true;
  }
  
  // Memo Comments
  async createMemoComment(comment: InsertMemoComment): Promise<MemoComment> {
    const id = this.commentIdCounter++;
    const createdAt = new Date();
    const newComment: MemoComment = { ...comment, id, createdAt };
    this.memoComments.set(id, newComment);
    return newComment;
  }
  
  async getMemoComments(memoId: number): Promise<MemoComment[]> {
    return Array.from(this.memoComments.values())
      .filter(comment => comment.memoId === memoId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  
  async getMemoCommentsByDeal(dealId: number): Promise<MemoComment[]> {
    return Array.from(this.memoComments.values())
      .filter(comment => comment.dealId === dealId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  // Capital Calls implementation
  async createCapitalCall(capitalCall: InsertCapitalCall): Promise<CapitalCall> {
    const id = this.capitalCallIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const newCapitalCall: CapitalCall = { ...capitalCall, id, createdAt, updatedAt };
    this.capitalCalls.set(id, newCapitalCall);
    return newCapitalCall;
  }

  async getCapitalCall(id: number): Promise<CapitalCall | undefined> {
    return this.capitalCalls.get(id);
  }

  async getAllCapitalCalls(): Promise<CapitalCall[]> {
    return Array.from(this.capitalCalls.values());
  }

  async getFundAllocation(id: number): Promise<FundAllocation | undefined> {
    return this.fundAllocations.get(id);
  }

  async getCapitalCallsByAllocation(allocationId: number): Promise<CapitalCall[]> {
    return Array.from(this.capitalCalls.values())
      .filter(call => call.allocationId === allocationId)
      .sort((a, b) => new Date(a.callDate).getTime() - new Date(b.callDate).getTime());
  }

  async getCapitalCallsByDeal(dealId: number): Promise<CapitalCall[]> {
    // First get all allocations for the deal
    const allocations = await this.getAllocationsByDeal(dealId);
    if (!allocations.length) return [];
    
    // Then get all capital calls for those allocations
    const allocationIds = allocations.map(allocation => allocation.id);
    return Array.from(this.capitalCalls.values())
      .filter(call => allocationIds.includes(call.allocationId))
      .sort((a, b) => new Date(a.callDate).getTime() - new Date(b.callDate).getTime());
  }

  async updateCapitalCallStatus(id: number, status: CapitalCall['status'], paidAmount?: number): Promise<CapitalCall | undefined> {
    const capitalCall = this.capitalCalls.get(id);
    if (!capitalCall) return undefined;
    
    const updatedCapitalCall: CapitalCall = {
      ...capitalCall,
      status,
      updatedAt: new Date(),
      ...(paidAmount !== undefined && { paidAmount }),
      ...(status === 'paid' && { paidDate: new Date() })
    };
    
    this.capitalCalls.set(id, updatedCapitalCall);
    return updatedCapitalCall;
  }
}

// We're using MemStorage for now for development
// In production, you should use DatabaseStorage with PostgreSQL
// Export a storage instance for backward compatibility
// This will be replaced by the StorageFactory

// Uncomment to use database storage
// export const storage = new DatabaseStorage();
