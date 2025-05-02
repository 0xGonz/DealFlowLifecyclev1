/**
 * Available sectors for deals
 */
export const DEAL_SECTORS = [
  "Private Credit",
  "Buyout",
  "Crypto",
  "GP Stakes",
  "Energy",
  "Venture",
  "Technology",
  "SaaS",
  "Fintech",
  "AI/ML",
  "Cybersecurity",
  "Healthcare", 
  "Biotech",
  "Renewable Energy",
  "Clean Tech",
  "Consumer Goods",
  "E-commerce",
  "Retail",
  "Real Estate",
  "Other"
] as const;

// Type for sectors
export type DealSector = typeof DEAL_SECTORS[number];
