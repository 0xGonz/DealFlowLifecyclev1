import NodeCache from 'node-cache';

/**
 * Enterprise Caching Service
 * Implements intelligent caching for investment platform performance
 */

export class CacheService {
  private static instance: CacheService;
  private cache: NodeCache;
  private dealCache: NodeCache;
  private documentCache: NodeCache;
  private userCache: NodeCache;

  private constructor() {
    // Main application cache - 10 minute TTL
    this.cache = new NodeCache({ 
      stdTTL: 600, 
      checkperiod: 120,
      useClones: false 
    });

    // Deal-specific cache - 5 minute TTL (frequently updated)
    this.dealCache = new NodeCache({ 
      stdTTL: 300, 
      checkperiod: 60,
      useClones: false 
    });

    // Document metadata cache - 30 minute TTL (stable data)
    this.documentCache = new NodeCache({ 
      stdTTL: 1800, 
      checkperiod: 300,
      useClones: false 
    });

    // User data cache - 15 minute TTL
    this.userCache = new NodeCache({ 
      stdTTL: 900, 
      checkperiod: 180,
      useClones: false 
    });
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Generic cache operations
   */
  set(key: string, value: any, ttl?: number): boolean {
    return this.cache.set(key, value, ttl);
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  del(key: string): number {
    return this.cache.del(key);
  }

  /**
   * Deal-specific caching with intelligent invalidation
   */
  setDeal(dealId: number, dealData: any): boolean {
    const key = `deal:${dealId}`;
    return this.dealCache.set(key, dealData);
  }

  getDeal(dealId: number): any | undefined {
    const key = `deal:${dealId}`;
    return this.dealCache.get(key);
  }

  invalidateDeal(dealId: number): void {
    const key = `deal:${dealId}`;
    this.dealCache.del(key);
    
    // Invalidate related caches
    this.invalidateDealsForUser();
    this.invalidatePattern(`deal:${dealId}:*`);
  }

  /**
   * User-specific caching
   */
  setUser(userId: number, userData: any): boolean {
    const key = `user:${userId}`;
    return this.userCache.set(key, userData);
  }

  getUser(userId: number): any | undefined {
    const key = `user:${userId}`;
    return this.userCache.get(key);
  }

  invalidateUser(userId: number): void {
    const key = `user:${userId}`;
    this.userCache.del(key);
  }

  /**
   * Document caching with metadata optimization
   */
  setDocument(docId: number, docData: any): boolean {
    const key = `doc:${docId}`;
    return this.documentCache.set(key, docData);
  }

  getDocument(docId: number): any | undefined {
    const key = `doc:${docId}`;
    return this.documentCache.get(key);
  }

  setDocumentsByDeal(dealId: number, documents: any[]): boolean {
    const key = `docs:deal:${dealId}`;
    return this.documentCache.set(key, documents);
  }

  getDocumentsByDeal(dealId: number): any[] | undefined {
    const key = `docs:deal:${dealId}`;
    return this.documentCache.get(key);
  }

  invalidateDocumentsByDeal(dealId: number): void {
    const key = `docs:deal:${dealId}`;
    this.documentCache.del(key);
  }

  /**
   * List and aggregation caching
   */
  setDealsList(userId: number, deals: any[]): boolean {
    const key = `deals:user:${userId}`;
    return this.dealCache.set(key, deals);
  }

  getDealsList(userId: number): any[] | undefined {
    const key = `deals:user:${userId}`;
    return this.dealCache.get(key);
  }

  invalidateDealsForUser(userId?: number): void {
    if (userId) {
      const key = `deals:user:${userId}`;
      this.dealCache.del(key);
    } else {
      // Invalidate all user deal lists
      this.invalidatePattern('deals:user:*');
    }
  }

  /**
   * Dashboard metrics caching
   */
  setDashboardMetrics(userId: number, metrics: any): boolean {
    const key = `dashboard:${userId}`;
    return this.cache.set(key, metrics, 300); // 5 minute TTL for metrics
  }

  getDashboardMetrics(userId: number): any | undefined {
    const key = `dashboard:${userId}`;
    return this.cache.get(key);
  }

  invalidateDashboardMetrics(userId?: number): void {
    if (userId) {
      const key = `dashboard:${userId}`;
      this.cache.del(key);
    } else {
      this.invalidatePattern('dashboard:*');
    }
  }

  /**
   * Fund performance caching
   */
  setFundPerformance(fundId: number, performance: any): boolean {
    const key = `fund:performance:${fundId}`;
    return this.cache.set(key, performance, 1800); // 30 minute TTL
  }

  getFundPerformance(fundId: number): any | undefined {
    const key = `fund:performance:${fundId}`;
    return this.cache.get(key);
  }

  invalidateFundPerformance(fundId: number): void {
    const key = `fund:performance:${fundId}`;
    this.cache.del(key);
  }

  /**
   * Pattern-based invalidation helper
   */
  private invalidatePattern(pattern: string): void {
    const allCaches = [this.cache, this.dealCache, this.documentCache, this.userCache];
    
    allCaches.forEach(cache => {
      const keys = cache.keys();
      const regex = new RegExp(pattern.replace('*', '.*'));
      
      keys.forEach(key => {
        if (regex.test(key)) {
          cache.del(key);
        }
      });
    });
  }

  /**
   * Cache statistics for monitoring
   */
  getStats(): any {
    return {
      main: this.cache.getStats(),
      deals: this.dealCache.getStats(),
      documents: this.documentCache.getStats(),
      users: this.userCache.getStats()
    };
  }

  /**
   * Clear all caches (use with caution)
   */
  clearAll(): void {
    this.cache.flushAll();
    this.dealCache.flushAll();
    this.documentCache.flushAll();
    this.userCache.flushAll();
  }

  /**
   * Health check for cache service
   */
  healthCheck(): { status: string; details: any } {
    try {
      const testKey = 'health_check';
      const testValue = Date.now();
      
      this.cache.set(testKey, testValue, 1);
      const retrieved = this.cache.get(testKey);
      this.cache.del(testKey);
      
      const isHealthy = retrieved === testValue;
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          working: isHealthy,
          stats: this.getStats()
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: { error: error.message }
      };
    }
  }
}