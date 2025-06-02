/**
 * Fund Architecture Interfaces - Modular and Scalable Design
 * Defines contracts for fund management components to ensure loose coupling
 */

import { Fund, FundAllocation, CapitalCall, Distribution } from '@shared/schema';

// Core fund management interface
export interface IFundManager {
  calculateMetrics(fundId: number): Promise<FundMetrics>;
  updateAUM(fundId: number): Promise<boolean>;
  validateAllocation(allocation: Partial<FundAllocation>): Promise<boolean>;
}

// Portfolio management interface
export interface IPortfolioManager {
  recalculateWeights(fundId: number): Promise<void>;
  calculateDiversification(fundId: number): Promise<DiversificationMetrics>;
  assessRisk(fundId: number): Promise<RiskMetrics>;
}

// Capital call management interface
export interface ICapitalCallManager {
  scheduleCall(allocationId: number, callData: CapitalCallSchedule): Promise<CapitalCall[]>;
  processPayment(callId: number, payment: PaymentData): Promise<CapitalCall>;
  updateStatus(callId: number, status: string): Promise<CapitalCall>;
}

// Distribution management interface
export interface IDistributionManager {
  recordDistribution(allocationId: number, distribution: DistributionData): Promise<Distribution>;
  calculateReturns(allocationId: number): Promise<ReturnMetrics>;
  updatePerformanceMetrics(allocationId: number): Promise<void>;
}

// Performance calculation interface
export interface IPerformanceCalculator {
  calculateMOIC(allocationId: number): Promise<number>;
  calculateIRR(allocationId: number): Promise<number>;
  calculateTotalReturn(allocationId: number): Promise<number>;
}

// Fund metrics type definitions
export interface FundMetrics {
  committedCapital: number;
  calledCapital: number;
  uncalledCapital: number;
  aum: number;
  totalDistributions: number;
  netReturn: number;
  moic: number;
  irr: number;
}

export interface DiversificationMetrics {
  sectorDistribution: Record<string, number>;
  stageDistribution: Record<string, number>;
  concentrationRisk: number;
}

export interface RiskMetrics {
  portfolioRisk: number;
  correlationMatrix: number[][];
  valueAtRisk: number;
}

export interface ReturnMetrics {
  totalReturn: number;
  realizedReturn: number;
  unrealizedReturn: number;
  moic: number;
  irr: number;
}

// Data structure interfaces
export interface CapitalCallSchedule {
  scheduleType: 'single' | 'multiple';
  frequency?: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  firstCallDate: Date;
  callCount?: number;
  callPercentage?: number;
}

export interface PaymentData {
  amount: number;
  paymentDate: Date;
  paymentType: 'wire' | 'check' | 'ach' | 'other';
  notes?: string;
  createdBy: number;
}

export interface DistributionData {
  amount: number;
  distributionDate: Date;
  distributionType: 'dividend' | 'capital_gain' | 'return_of_capital' | 'liquidation' | 'other';
  description?: string;
}

// Event-driven architecture interfaces
export interface IFundEventHandler {
  onAllocationCreated(allocation: FundAllocation): Promise<void>;
  onCapitalCallProcessed(capitalCall: CapitalCall): Promise<void>;
  onDistributionRecorded(distribution: Distribution): Promise<void>;
  onPerformanceUpdated(allocationId: number, metrics: ReturnMetrics): Promise<void>;
}

// Notification interface for fund events
export interface IFundNotificationService {
  notifyCapitalCallDue(capitalCall: CapitalCall): Promise<void>;
  notifyDistributionReceived(distribution: Distribution): Promise<void>;
  notifyPerformanceMilestone(allocationId: number, milestone: string): Promise<void>;
}