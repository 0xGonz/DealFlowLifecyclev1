/**
 * Capital Calls Configuration System
 * Eliminates all hardcoded values from the capital calls module
 */

import { CAPITAL_CALL_TIMING, PAYMENT_DEFAULTS, ALLOCATION_STATUS } from '@shared/constants';

export interface CapitalCallsConfig {
  timing: {
    defaultDueDays: number;
    paymentGraceDays: number;
    reminderDaysBeforePayment: number;
    defaultCallFrequency: string;
  };
  payments: {
    initialPaidAmount: number;
    defaultPaymentType: 'wire' | 'check' | 'ach' | 'other';
    allowOverpayments: boolean;
    requirePaymentNotes: boolean;
  };
  statusTransitions: {
    validTransitions: Record<string, string[]>;
    terminalStatuses: string[];
    autoStatusUpdate: boolean;
  };
  dateHandling: {
    timeZone: string;
    defaultTimeUTC: number; // Hour in UTC (12 = noon)
    dateFormat: string;
  };
  notifications: {
    enableEmailReminders: boolean;
    enableStatusChangeNotifications: boolean;
    reminderSchedule: number[]; // Days before due date
  };
  performance: {
    enableBatchQueries: boolean;
    cacheTimeout: number; // milliseconds
    maxBatchSize: number;
  };
}

export const defaultCapitalCallsConfig: CapitalCallsConfig = {
  timing: {
    defaultDueDays: CAPITAL_CALL_TIMING.DEFAULT_DUE_DAYS,
    paymentGraceDays: CAPITAL_CALL_TIMING.PAYMENT_GRACE_DAYS,
    reminderDaysBeforePayment: CAPITAL_CALL_TIMING.REMINDER_DAYS_BEFORE,
    defaultCallFrequency: 'quarterly'
  },
  payments: {
    initialPaidAmount: PAYMENT_DEFAULTS.INITIAL_PAID_AMOUNT,
    defaultPaymentType: 'wire',
    allowOverpayments: false,
    requirePaymentNotes: false
  },
  statusTransitions: {
    validTransitions: {
      'scheduled': ['called', 'overdue', 'defaulted', 'partially_paid', 'paid'],
      'called': ['partially_paid', 'paid', 'overdue', 'defaulted'],
      'partially_paid': ['paid', 'overdue', 'defaulted'],
      'overdue': ['paid', 'defaulted', 'partially_paid'],
      'paid': [], // Terminal state
      'defaulted': [] // Terminal state
    },
    terminalStatuses: ['paid', 'defaulted'],
    autoStatusUpdate: true
  },
  dateHandling: {
    timeZone: 'UTC',
    defaultTimeUTC: 12, // Noon UTC
    dateFormat: 'yyyy-MM-dd'
  },
  notifications: {
    enableEmailReminders: true,
    enableStatusChangeNotifications: true,
    reminderSchedule: [7, 3, 1] // 7, 3, and 1 days before due date
  },
  performance: {
    enableBatchQueries: true,
    cacheTimeout: 300000, // 5 minutes
    maxBatchSize: 100
  }
};

/**
 * Capital Calls Configuration Manager
 * Provides runtime configuration with environment variable overrides
 */
export class CapitalCallsConfigManager {
  private static instance: CapitalCallsConfigManager;
  private config: CapitalCallsConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): CapitalCallsConfigManager {
    if (!CapitalCallsConfigManager.instance) {
      CapitalCallsConfigManager.instance = new CapitalCallsConfigManager();
    }
    return CapitalCallsConfigManager.instance;
  }

  private loadConfig(): CapitalCallsConfig {
    const config = { ...defaultCapitalCallsConfig };

    // Override with environment variables if available
    if (process.env.CAPITAL_CALL_DUE_DAYS) {
      config.timing.defaultDueDays = parseInt(process.env.CAPITAL_CALL_DUE_DAYS);
    }

    if (process.env.CAPITAL_CALL_GRACE_DAYS) {
      config.timing.paymentGraceDays = parseInt(process.env.CAPITAL_CALL_GRACE_DAYS);
    }

    if (process.env.CAPITAL_CALL_DEFAULT_PAYMENT_TYPE) {
      config.payments.defaultPaymentType = process.env.CAPITAL_CALL_DEFAULT_PAYMENT_TYPE as any;
    }

    if (process.env.CAPITAL_CALL_ALLOW_OVERPAYMENTS) {
      config.payments.allowOverpayments = process.env.CAPITAL_CALL_ALLOW_OVERPAYMENTS === 'true';
    }

    if (process.env.CAPITAL_CALL_TIMEZONE) {
      config.dateHandling.timeZone = process.env.CAPITAL_CALL_TIMEZONE;
    }

    if (process.env.CAPITAL_CALL_ENABLE_BATCH_QUERIES) {
      config.performance.enableBatchQueries = process.env.CAPITAL_CALL_ENABLE_BATCH_QUERIES === 'true';
    }

    return config;
  }

  public getConfig(): CapitalCallsConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<CapitalCallsConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Convenience methods for commonly used values
  public getDefaultDueDays(): number {
    return this.config.timing.defaultDueDays;
  }

  public getDefaultPaymentType(): string {
    return this.config.payments.defaultPaymentType;
  }

  public getInitialPaidAmount(): number {
    return this.config.payments.initialPaidAmount;
  }

  public getValidStatusTransitions(): Record<string, string[]> {
    return this.config.statusTransitions.validTransitions;
  }

  public isTerminalStatus(status: string): boolean {
    return this.config.statusTransitions.terminalStatuses.includes(status);
  }

  public getDefaultTimeUTC(): number {
    return this.config.dateHandling.defaultTimeUTC;
  }

  public isBatchQueriesEnabled(): boolean {
    return this.config.performance.enableBatchQueries;
  }

  public getMaxBatchSize(): number {
    return this.config.performance.maxBatchSize;
  }
}

// Export singleton instance
export const capitalCallsConfig = CapitalCallsConfigManager.getInstance();