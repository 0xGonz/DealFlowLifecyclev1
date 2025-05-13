/**
 * Company Stages
 * 
 * These represent the funding/growth stages of a company in a venture context
 * rather than the deal evaluation stages within our firm.
 */
export const COMPANY_STAGES = {
  'pre_seed': 'Pre-Seed',
  'seed': 'Seed',
  'series_a': 'Series A',
  'series_b': 'Series B',
  'series_c': 'Series C',
  'series_d_plus': 'Series D+',
  'growth': 'Growth',
  'pre_ipo': 'Pre-IPO',
  'public': 'Public',
  'mature': 'Mature',
  'distressed': 'Distressed',
  'acquisition': 'Acquisition Target',
  'lbo': 'LBO',
  'real_estate': 'Real Estate',
  'other': 'Other'
} as const;

export type CompanyStage = keyof typeof COMPANY_STAGES;