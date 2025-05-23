/**
 * Centralized Service Layer for Investment Platform
 * Implements enterprise-grade modularity and separation of concerns
 */

// Core business logic services (temporarily commented out for deployment)
// export { DealService } from './deal.service';
// export { FundService } from './fund.service';
// TODO: Implement these services
// export { DocumentService } from './document.service';
// export { NotificationService } from './notification.service';
// export { AnalyticsService } from './analytics.service';

// Infrastructure services
export { AuthorizationService } from './authorization.service';
export { ValidationService } from './validation.service';
export { CacheService } from './cache.service';
export { MetricsService } from './metrics.service';

// TODO: Implement these services
// export { EncryptionService } from './encryption.service';

// Temporary LoggingService implementation
export class LoggingService {
  static info(message: string, meta?: any) {
    console.log(`[INFO] ${message}`, meta || '');
  }

  static error(message: string, error?: any) {
    console.error(`[ERROR] ${message}`, error || '');
  }

  static warn(message: string, meta?: any) {
    console.warn(`[WARN] ${message}`, meta || '');
  }

  static debug(message: string, meta?: any) {
    console.debug(`[DEBUG] ${message}`, meta || '');
  }
}

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