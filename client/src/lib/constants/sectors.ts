/**
 * Available sectors for deals - alphabetically sorted
 */
export const DEAL_SECTORS = [
  "AI/ML",
  "Biotech",
  "Buyout",
  "Clean Tech",
  "Consumer Goods",
  "Crypto",
  "Cybersecurity",
  "E-commerce",
  "Energy",
  "Fintech",
  "GP Stakes",
  "Healthcare", 
  "Private Credit",
  "Real Estate",
  "Renewable Energy",
  "Retail",
  "SaaS",
  "Technology",
  "Venture",
  "Other"
] as const;

// Type for sectors
export type DealSector = typeof DEAL_SECTORS[number];
