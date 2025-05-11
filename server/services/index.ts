import { BaseService } from './BaseService';
import { DealService } from './DealService';
import { UserService } from './UserService';
import { CacheService } from './CacheService';
import { LoggingService } from './LoggingService';
import { MetricsService } from './MetricsService';
import { JobQueueService } from './JobQueue';

// Export all services
export {
  BaseService,
  DealService,
  UserService,
  CacheService,
  LoggingService,
  MetricsService,
  JobQueueService
};

// Create service instances for singleton use
export const dealService = new DealService();
export const userService = new UserService();
export const cacheService = CacheService.getInstance();
export const loggingService = LoggingService.getInstance();
export const metricsService = MetricsService.getInstance();
export const jobQueueService = JobQueueService.getInstance();

// Factory function to get service instances
export function getService(serviceType: 'deal'): DealService;
export function getService(serviceType: 'user'): UserService;
export function getService(serviceType: 'cache'): CacheService;
export function getService(serviceType: 'logging'): LoggingService;
export function getService(serviceType: 'metrics'): MetricsService;
export function getService(serviceType: 'jobQueue'): JobQueueService;
export function getService(serviceType: string): BaseService | CacheService | LoggingService | MetricsService | JobQueueService {
  switch (serviceType) {
    case 'deal':
      return dealService;
    case 'user':
      return userService;
    case 'cache':
      return cacheService;
    case 'logging':
      return loggingService;
    case 'metrics':
      return metricsService;
    case 'jobQueue':
      return jobQueueService;
    default:
      throw new Error(`Unknown service type: ${serviceType}`);
  }
}