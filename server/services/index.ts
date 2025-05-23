/**
 * Centralized Service Layer for Investment Platform
 * Implements enterprise-grade modularity and separation of concerns
 */

// Core business logic services
export { DealService } from './deal.service';
export { FundService } from './fund.service';
export { DocumentService } from './document.service';
export { UserService } from './user.service';
export { NotificationService } from './notification.service';
export { AnalyticsService } from './analytics.service';

// Infrastructure services
export { CacheService } from './cache.service';
export { ValidationService } from './validation.service';
export { AuditService } from './audit.service';
export { MetricsService } from './metrics.service';
export { LoggingService } from './logging.service';

// Security services
export { AuthorizationService } from './authorization.service';
export { EncryptionService } from './encryption.service';

/**
 * Service factory for dependency injection
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service;
  }

  has(name: string): boolean {
    return this.services.has(name);
  }
}