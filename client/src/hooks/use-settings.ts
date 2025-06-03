/**
 * Settings hook to fetch configurable application settings
 * Eliminates hardcoded values in frontend components
 */

import { useQuery } from '@tanstack/react-query';

export interface AppSettings {
  fund: {
    maxCommitment: number;
    minCommitment: number;
    currencyStep: number;
    percentagePrecision: number;
    defaultCallDueDays: number;
    minCallDueDays: number;
    maxCallDueDays: number;
    maxPortfolioWeight: number;
    minAllocationAmount: number;
    irrPrecision: number;
    moicPrecision: number;
  };
  ui: {
    pageSize: number;
    maxFileSize: number;
    allowedFileTypes: string[];
  };
  performance: {
    batchSize: number;
    recalcThrottleMs: number;
  };
  environment: {
    isDevelopment: boolean;
    isProduction: boolean;
  };
}

/**
 * Hook to fetch application settings from the server
 * This replaces all hardcoded configuration values in the frontend
 */
export function useSettings() {
  return useQuery({
    queryKey: ['/api/settings'],
    staleTime: 5 * 60 * 1000, // 5 minutes - settings don't change often
  });
}

/**
 * Hook to get fund-specific settings with defaults
 */
export function useFundSettings() {
  const { data: settings, isLoading, error } = useSettings();
  
  // Provide sensible fallbacks while settings are loading
  const fundSettings = (settings as AppSettings)?.fund || {
    maxCommitment: 10000000000,
    minCommitment: 1000,
    currencyStep: 1000,
    percentagePrecision: 2,
    defaultCallDueDays: 30,
    minCallDueDays: 7,
    maxCallDueDays: 180,
    maxPortfolioWeight: 1.0,
    minAllocationAmount: 1000,
    irrPrecision: 4,
    moicPrecision: 2,
  };
  
  return {
    settings: fundSettings,
    isLoading,
    error,
  };
}

/**
 * Hook to get UI-specific settings with defaults
 */
export function useUISettings() {
  const { data: settings, isLoading, error } = useSettings();
  
  const uiSettings = (settings as AppSettings)?.ui || {
    pageSize: 25,
    maxFileSize: 10485760, // 10MB
    allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'],
  };
  
  return {
    settings: uiSettings,
    isLoading,
    error,
  };
}