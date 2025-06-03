/**
 * Constants for security types in fund allocations
 */

export const SECURITY_TYPES = {
  EQUITY: 'equity',
  DEBT: 'debt',
  CONVERTIBLE: 'convertible',
  PREFERRED: 'preferred',
  COMMON: 'common',
  WARRANT: 'warrant',
  OPTION: 'option',
  REAL_ESTATE: 'real_estate',
  VENTURE: 'venture',
  BUYOUT: 'buyout',
  ENERGY: 'energy',
  INFRASTRUCTURE: 'infrastructure',
  CREDIT: 'credit'
} as const;

export const SECURITY_TYPE_LABELS = {
  [SECURITY_TYPES.EQUITY]: 'Equity',
  [SECURITY_TYPES.DEBT]: 'Debt',
  [SECURITY_TYPES.CONVERTIBLE]: 'Convertible',
  [SECURITY_TYPES.PREFERRED]: 'Preferred Stock',
  [SECURITY_TYPES.COMMON]: 'Common Stock',
  [SECURITY_TYPES.WARRANT]: 'Warrant',
  [SECURITY_TYPES.OPTION]: 'Option',
  [SECURITY_TYPES.REAL_ESTATE]: 'Real Estate',
  [SECURITY_TYPES.VENTURE]: 'Venture',
  [SECURITY_TYPES.BUYOUT]: 'Buyout',
  [SECURITY_TYPES.ENERGY]: 'Energy',
  [SECURITY_TYPES.INFRASTRUCTURE]: 'Infrastructure',
  [SECURITY_TYPES.CREDIT]: 'Credit'
} as const;

export type SecurityType = typeof SECURITY_TYPES[keyof typeof SECURITY_TYPES];

export const getSecurityTypeLabel = (type: SecurityType): string => {
  return SECURITY_TYPE_LABELS[type] || type;
};

export const DEFAULT_SECURITY_TYPE = SECURITY_TYPES.EQUITY;