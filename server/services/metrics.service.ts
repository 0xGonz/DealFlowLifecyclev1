/**
 * Enterprise Metrics Service
 * Provides comprehensive performance monitoring and business intelligence
 */

export interface MetricData {
  timestamp: Date;
  value: number;
  tags?: Record<string, string>;
}

export interface PerformanceMetrics {
  uptime: number;
  requests: number;
  errors: number;
  errorRate: number;
  avgResponseTime: number;
  dealProcessingTime: number;
  documentProcessingTime: number;
}

export interface BusinessMetrics {
  totalDeals: number;
  activeDeals: number;
  dealsThisMonth: number;
  totalDocuments: number;
  documentsThisMonth: number;
  avgDealCycleTime: number;
  conversionRate: number;
  userActivity: Record<string, number>;
}

export class MetricsService {
  private static instance: MetricsService;
  private metrics: Map<string, MetricData[]> = new Map();
  private startTime: Date = new Date();
  private requestCount: number = 0;
  private errorCount: number = 0;
  private responseTimes: number[] = [];

  private constructor() {}

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * Record a metric value
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push({
      timestamp: new Date(),
      value,
      tags
    });

    // Keep only last 1000 entries per metric
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }

  /**
   * Track HTTP request metrics
   */
  trackRequest(responseTime: number, statusCode: number): void {
    this.requestCount++;
    this.responseTimes.push(responseTime);

    if (statusCode >= 400) {
      this.errorCount++;
    }

    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }

    this.recordMetric('http_requests', 1, { status: statusCode.toString() });
    this.recordMetric('response_time', responseTime);
  }

  /**
   * Track deal-related metrics
   */
  trackDealMetric(action: string, dealId: number, duration?: number): void {
    this.recordMetric(`deal_${action}`, 1, { dealId: dealId.toString() });
    
    if (duration) {
      this.recordMetric(`deal_${action}_duration`, duration, { dealId: dealId.toString() });
    }
  }

  /**
   * Track document processing metrics
   */
  trackDocumentMetric(action: string, fileSize: number, processingTime: number): void {
    this.recordMetric(`document_${action}`, 1);
    this.recordMetric('document_size', fileSize);
    this.recordMetric('document_processing_time', processingTime);
  }

  /**
   * Track user activity metrics
   */
  trackUserActivity(userId: number, action: string): void {
    this.recordMetric('user_activity', 1, { 
      userId: userId.toString(), 
      action 
    });
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const uptime = (Date.now() - this.startTime.getTime()) / 1000;
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;

    const dealProcessingTimes = this.getMetricValues('deal_processing_time');
    const avgDealProcessingTime = dealProcessingTimes.length > 0 
      ? dealProcessingTimes.reduce((a, b) => a + b, 0) / dealProcessingTimes.length 
      : 0;

    const docProcessingTimes = this.getMetricValues('document_processing_time');
    const avgDocProcessingTime = docProcessingTimes.length > 0 
      ? docProcessingTimes.reduce((a, b) => a + b, 0) / docProcessingTimes.length 
      : 0;

    return {
      uptime,
      requests: this.requestCount,
      errors: this.errorCount,
      errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
      avgResponseTime,
      dealProcessingTime: avgDealProcessingTime,
      documentProcessingTime: avgDocProcessingTime
    };
  }

  /**
   * Get business metrics (requires storage integration)
   */
  async getBusinessMetrics(storage: any): Promise<BusinessMetrics> {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [deals, documents, users] = await Promise.all([
        storage.getDeals ? storage.getDeals() : [],
        storage.getDocuments ? storage.getDocuments() : [],
        storage.getUsers ? storage.getUsers() : []
      ]);

      const totalDeals = deals.length;
      const activeDeals = deals.filter((d: any) => 
        !['closed', 'rejected', 'invested'].includes(d.stage)
      ).length;
      
      const dealsThisMonth = deals.filter((d: any) => 
        new Date(d.createdAt) >= monthStart
      ).length;

      const totalDocuments = documents.length;
      const documentsThisMonth = documents.filter((d: any) => 
        new Date(d.uploadedAt) >= monthStart
      ).length;

      // Calculate average deal cycle time
      const completedDeals = deals.filter((d: any) => 
        ['closed', 'invested'].includes(d.stage)
      );
      
      const avgDealCycleTime = completedDeals.length > 0 
        ? completedDeals.reduce((sum: number, deal: any) => {
            const cycleTime = new Date(deal.updatedAt).getTime() - new Date(deal.createdAt).getTime();
            return sum + cycleTime;
          }, 0) / completedDeals.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      // Calculate conversion rate (invested / total)
      const investedDeals = deals.filter((d: any) => d.stage === 'invested').length;
      const conversionRate = totalDeals > 0 ? investedDeals / totalDeals : 0;

      // User activity metrics
      const userActivity: Record<string, number> = {};
      const activityMetrics = this.getMetricsByTag('user_activity', 'userId');
      Object.entries(activityMetrics).forEach(([userId, count]) => {
        const user = users.find((u: any) => u.id.toString() === userId);
        if (user) {
          userActivity[user.fullName || user.username] = count;
        }
      });

      return {
        totalDeals,
        activeDeals,
        dealsThisMonth,
        totalDocuments,
        documentsThisMonth,
        avgDealCycleTime,
        conversionRate,
        userActivity
      };
    } catch (error) {
      console.error('Error calculating business metrics:', error);
      return {
        totalDeals: 0,
        activeDeals: 0,
        dealsThisMonth: 0,
        totalDocuments: 0,
        documentsThisMonth: 0,
        avgDealCycleTime: 0,
        conversionRate: 0,
        userActivity: {}
      };
    }
  }

  /**
   * Get metric values for analysis
   */
  private getMetricValues(metricName: string): number[] {
    const metrics = this.metrics.get(metricName) || [];
    return metrics.map(m => m.value);
  }

  /**
   * Get metrics grouped by tag value
   */
  private getMetricsByTag(metricName: string, tagKey: string): Record<string, number> {
    const metrics = this.metrics.get(metricName) || [];
    const grouped: Record<string, number> = {};

    metrics.forEach(metric => {
      if (metric.tags && metric.tags[tagKey]) {
        const tagValue = metric.tags[tagKey];
        grouped[tagValue] = (grouped[tagValue] || 0) + metric.value;
      }
    });

    return grouped;
  }

  /**
   * Get top performing deals by activity
   */
  getTopDeals(limit: number = 10): Array<{ dealId: string; activity: number }> {
    const dealActivity = this.getMetricsByTag('deal_view', 'dealId');
    
    return Object.entries(dealActivity)
      .map(([dealId, activity]) => ({ dealId, activity }))
      .sort((a, b) => b.activity - a.activity)
      .slice(0, limit);
  }

  /**
   * Get system health indicators
   */
  getHealthIndicators(): Record<string, any> {
    const performance = this.getPerformanceMetrics();
    
    return {
      status: performance.errorRate < 0.05 ? 'healthy' : 'degraded',
      uptime: performance.uptime,
      errorRate: performance.errorRate,
      avgResponseTime: performance.avgResponseTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
  }

  /**
   * Reset all metrics (use for testing)
   */
  reset(): void {
    this.metrics.clear();
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
    this.startTime = new Date();
  }
}