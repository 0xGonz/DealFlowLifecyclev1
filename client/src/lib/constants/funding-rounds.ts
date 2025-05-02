/**
 * Available funding rounds for deals
 */
export const FUNDING_ROUNDS = [
  "Seed",
  "Seed Extension",
  "Series A",
  "Series B",
  "Series C",
  "Series D+",
  "Growth",
  "Late Stage",
  "Pre-IPO"
] as const;

// Type for funding rounds
export type FundingRound = typeof FUNDING_ROUNDS[number];
