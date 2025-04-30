// User types
export interface User {
  id: number;
  username: string;
  fullName: string;
  initials: string;
  email: string;
  role: "admin" | "partner" | "analyst" | "observer";
  avatarColor: string;
}

// Deal types
export interface Deal {
  id: number;
  name: string;
  description: string;
  industry: string;
  stage: "initial_review" | "screening" | "due_diligence" | "ic_review" | "closing" | "closed" | "passed";
  stageLabel: string;
  round: string;
  targetRaise?: string;
  valuation?: string;
  leadInvestor?: string;
  contactEmail?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  tags: string[];
  assignedUsers?: number[];
  starCount: number;
  score?: number;
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

// Deal star types
export interface DealStar {
  id: number;
  dealId: number;
  userId: number;
  createdAt: string;
}

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
}
