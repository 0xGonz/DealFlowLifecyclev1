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
  const stageConfig = DEAL_STAGES.find(s => s.value === stage);
  return stageConfig?.label || 'Unknown Stage';
}