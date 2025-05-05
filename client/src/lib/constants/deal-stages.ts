import { DealStageLabels, DealStageColors } from "@shared/schema";

/**
 * Available stages for deals
 * This provides a central place to manage all deal stages
 */
export const DEAL_STAGES = [
  "initial_review",
  "screening",
  "diligence",
  "ic_review",
  "closing", 
  "closed",
  "invested",
  "rejected"
] as const;

// Export the existing stage labels for easy access
export { DealStageLabels, DealStageColors };

// Type for deal stages
export type DealStage = typeof DEAL_STAGES[number];

/**
 * Group deal stages by their status (active, invested, rejected)
 */
export const DEAL_STAGE_GROUPS = {
  active: ["initial_review", "screening", "diligence", "ic_review", "closing", "closed"],
  invested: ["invested"],
  rejected: ["rejected"]
} as const;

/**
 * Order of stages for progression
 */
export const DEAL_STAGE_ORDER = [
  "initial_review",
  "screening",
  "diligence",
  "ic_review",
  "closing",
  "closed",
  "invested"
] as const;

/**
 * Get the next stage in the progression
 */
export function getNextStage(currentStage: DealStage): DealStage | undefined {
  const currentIndex = DEAL_STAGE_ORDER.indexOf(currentStage as any);
  if (currentIndex === -1 || currentIndex === DEAL_STAGE_ORDER.length - 1) {
    return undefined;
  }
  return DEAL_STAGE_ORDER[currentIndex + 1] as DealStage;
}

/**
 * Get the previous stage in the progression
 */
export function getPreviousStage(currentStage: DealStage): DealStage | undefined {
  const currentIndex = DEAL_STAGE_ORDER.indexOf(currentStage as any);
  if (currentIndex <= 0) {
    return undefined;
  }
  return DEAL_STAGE_ORDER[currentIndex - 1] as DealStage;
}
