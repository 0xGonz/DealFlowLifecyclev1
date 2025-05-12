import type { Deal } from "@shared/schema";
import { DEAL_STAGES } from "@/lib/constants/deal-constants";

/**
 * Enriches a deal object with computed properties
 * for consistent access across the application
 */
export function enrichDealWithComputedProps(deal: Deal): Deal & { stageLabel: string } {
  return {
    ...deal,
    stageLabel: getStageLabel(deal.stage),
  };
}

/**
 * Returns a user-friendly label for a deal stage
 */
function getStageLabel(stage: string): string {
  // Map stage values to human-readable labels
  const stageLabels: {[key: string]: string} = {
    'initial_review': 'Initial Review',
    'screening': 'Screening',
    'diligence': 'Diligence',
    'ic_review': 'IC Review',
    'approved': 'Approved',
    'decline': 'Declined',
    'rejected': 'Rejected',
    'closed': 'Closed',
    'closing': 'Closing',
    'invested': 'Invested',
    'ai_review': 'AI Review'
  };
  
  return stageLabels[stage] || 'Unknown Stage';
}