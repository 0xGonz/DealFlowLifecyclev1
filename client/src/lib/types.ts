// User types
export interface User {
  id: number;
  username: string;
  fullName: string;
  initials: string;
  email: string;
  role: "admin" | "partner" | "analyst" | "observer" | "intern";
  avatarColor: string;
}

// Deal types
// Deal star type
export interface DealStar {
  id: number;
  dealId: number;
  userId: number;
  createdAt: string;
}

export interface Deal {
  id: number;
  name: string;
  description: string;
  sector: string;
  stage: "initial_review" | "screening" | "diligence" | "ic_review" | "closing" | "closed" | "invested" | "rejected";
  stageLabel?: string; // Frontend computed property
  round: string;
  targetRaise?: string;
  valuation?: string;
  leadInvestor?: string;
  contactEmail?: string;
  notes?: string;
  targetReturn?: string; // Expected or target return percentage
  rejectionReason?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  tags: string[];
  // Investment details
  amount?: number; // Deal size
  ownershipPercentage?: number; // Ownership percentage
  companyStage?: string; // Stage of the target company
  investmentThesis?: string; // Investment thesis
  riskFactors?: string; // Risk factors
  projectedIrr?: number; // Projected IRR as percentage
  projectedMultiple?: number; // Projected return multiple
  // Frontend computed properties
  assignedUsers?: User[]; // Frontend computed property from deal assignments
  starCount?: number; // Frontend computed property from stars count
  score?: number; // Frontend computed property from average memo scores
  miniMemos?: MiniMemo[]; // Frontend relationship 
  allocations?: FundAllocation[]; // Frontend relationship
  timelineEvents?: TimelineEvent[]; // Frontend relationship for timeline events
}

// Timeline event types
export interface TimelineEvent {
  id: number;
  dealId: number;
  eventType: "note" | "stage_change" | "document_upload" | "memo_added" | "star_added" | "ai_analysis";
  content: string;
  createdBy: number;
  createdAt: string;
  metadata: Record<string, any>;
  user?: {
    id: number;
    fullName: string;
    initials: string;
    avatarColor: string;
  };
}

// Note: DealStar is defined above

// Mini memo types
export interface MiniMemo {
  id: number;
  dealId: number;
  userId: number;
  thesis: string;
  risksAndMitigations?: string;
  pricingConsideration?: string;
  score: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    fullName: string;
    initials: string;
    avatarColor: string;
    role: string;
  };
}

// Fund types
export interface Fund {
  id: number;
  name: string;
  description: string;
  aum: number;
  createdAt: string;
  vintage?: number;
  distributionRate?: number;
  appreciationRate?: number;
  // These fields are computed on the server
  calculatedAum?: number;
  allocationCount?: number;
}

// Fund allocation types
export interface FundAllocation {
  id: number;
  fundId: number;
  dealId: number;
  amount: number;
  securityType: string;
  allocationDate: string;
  notes?: string;
}

// Dashboard stats
export interface DashboardStats {
  activeDeals: number;
  newDeals: number;
  inIcReview: number;
  totalAum: number;
  activeDealsTrend: number;
  newDealsTrend: number;
  icReviewTrend: number;
  aumTrend: number;
}

// Leaderboard item
export interface LeaderboardItem {
  id: number;
  name: string;
  stage: string;
  stageLabel: string;
  score: number;
  starCount: number;
  change: number;
  recentActivity?: number; // Number of recent timeline events (last 14 days)
}

// Document types
export interface Document {
  id: number;
  dealId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedBy: number;
  uploadedAt: string;
  documentType: string;
  description?: string;
}
