import Queue, { Job, JobOptions } from 'bull';
import { pool } from '../db';

/**
 * JobQueue service for handling asynchronous tasks
 * 
 * This service uses Bull to create and process job queues
 * for tasks that need to be processed in the background
 */
export class JobQueueService {
  private static instance: JobQueueService;
  
  // Map of queue names to Queue instances
  private queues: Map<string, Queue.Queue> = new Map();
  
  // Track whether Redis is available
  private redisAvailable: boolean = true;
  
  // Retry counter and max attempts
  private redisRetryCount: number = 0;
  private maxRedisRetries: number = 3;
  
  // Flag to control logging frequency
  private lastErrorLogTime: number = 0;
  private errorLogThrottleMs: number = 30000; // Only log every 30 seconds
  
  // Default queue options
  private defaultQueueOptions: Queue.QueueOptions = {
    redis: {
      port: 6379,
      host: process.env.REDIS_HOST || 'localhost',
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 5000, // 5 second connection timeout
      maxRetriesPerRequest: 2
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  };
  
  // Queue names
  public static QUEUES = {
    EMAIL: 'email',
    DOCUMENT_PROCESSING: 'document-processing',
    REPORT_GENERATION: 'report-generation',
    DATA_IMPORT: 'data-import',
    NOTIFICATIONS: 'notifications'
  };
  
  constructor() {
    console.log('Initializing job queue service...');
  }
  
  /**
   * Get the singleton instance of the job queue service
   */
  public static getInstance(): JobQueueService {
    if (!JobQueueService.instance) {
      JobQueueService.instance = new JobQueueService();
    }
    return JobQueueService.instance;
  }
  
  /**
   * Create a mock queue that simulates job processing locally
   */
  private createMockQueue(name: string): Queue.Queue {
    // More sophisticated mock queue implementation
    const mockQueue = {
      // Method to add a job that simulates execution locally
      add: (data: any, opts?: JobOptions) => {
        const now = Date.now();
        // Only log errors occasionally to avoid log spam
        if (now - this.lastErrorLogTime > this.errorLogThrottleMs) {
          console.warn(`Mock queue ${name} - Redis unavailable, processing locally: `, 
            JSON.stringify(data).substring(0, 100) + (JSON.stringify(data).length > 100 ? '...' : ''));
          this.lastErrorLogTime = now;
        }
        
        // Create a job ID for tracking
        const jobId = Math.floor(Math.random() * 1000000).toString();
        
        // Execute the handler directly for synchronous jobs if not large data
        // For async operations like emails, just log what would have happened
        setTimeout(() => {
          // Find any registered processor for this queue
          const registeredProcessors = (this.mockProcessors.get(name) || []);
          if (registeredProcessors.length > 0) {
            // Execute the first registered processor
            const mockJob = { 
              id: jobId,
              data,
              opts: opts || {},
              queue: { name } as any
            } as Job;
            
            registeredProcessors[0](mockJob)
              .then(() => console.log(`Mock queue ${name} - successfully processed job ${jobId}`))
              .catch(err => console.error(`Mock queue ${name} - error processing job ${jobId}:`, err));
          }
        }, 100); // Small delay to simulate async
        
        // Return a mock job
        return Promise.resolve({ 
          id: jobId,
          data,
          opts: opts || {}
        } as unknown as Job);
      },
      
      // Store the processor function for later use
      process: (concurrency: number, handler: (job: Job) => Promise<any>) => {
        // Store the processor for this queue
        if (!this.mockProcessors.has(name)) {
          this.mockProcessors.set(name, []);
        }
        this.mockProcessors.get(name)!.push(handler);
        console.warn(`Mock queue ${name} - registered processor with concurrency: ${concurrency}`);
      },
      
      // Other required methods for compatibility
      on: (event: string, handler: (...args: any[]) => void) => {
        // Skip events in mock mode
        return {} as any;
      },
      
      getJobs: (types: string[]) => {
        return Promise.resolve([]);
      },
      
      close: () => {
        return Promise.resolve();
      }
    } as unknown as Queue.Queue;
    
    return mockQueue;
  }
  
  // Map to store mock processors
  private mockProcessors: Map<string, Array<(job: Job) => Promise<any>>> = new Map();
  
  /**
   * Get or create a queue by name
   */
  public getQueue(name: string): Queue.Queue {
    // If we already have a queue instance, return it
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }
    
    // If Redis is known to be unavailable, create a mock queue directly
    if (!this.redisAvailable && this.redisRetryCount >= this.maxRedisRetries) {
      const mockQueue = this.createMockQueue(name);
      this.queues.set(name, mockQueue);
      return mockQueue;
    }
    
    // Attempt to create a real Bull queue with Redis
    try {
      const queueOptions = {
        ...this.defaultQueueOptions,
        settings: {
          stalledInterval: 300000, // 5 minutes
          maxStalledCount: 1,
          lockDuration: 30000,  // 30 seconds
          drainDelay: 5 // 5ms wait for semi-graceful shutdown
        }
      };
      
      console.log(`Creating queue: ${name}`);
      const queue = new Queue(name, queueOptions);
      
      // Reset retry counter on success
      this.redisAvailable = true;
      this.redisRetryCount = 0;
      
      // Set up event handlers for better observability
      // Track when errors occur for each queue
      const queueErrorCounts = new Map<string, number>();
      
      queue.on('error', (error) => {
        const now = Date.now();
        
        // Increment the error count for this specific queue
        const currentErrorCount = queueErrorCounts.get(name) || 0;
        queueErrorCounts.set(name, currentErrorCount + 1);
        
        // Log only occasionally to avoid spam 
        if (now - this.lastErrorLogTime > this.errorLogThrottleMs) {
          // Only log the first few errors per queue
          if (currentErrorCount < 3) {
            console.error(`Queue ${name} error:`, error);
          } else if (currentErrorCount === 3) {
            console.error(`Queue ${name}: Multiple Redis errors, future errors will be suppressed`);
          }
          this.lastErrorLogTime = now;
        }
        
        // If we get too many errors, mark Redis as unavailable
        this.redisRetryCount++;
        if (this.redisRetryCount >= this.maxRedisRetries && this.redisAvailable) {
          this.redisAvailable = false;
          console.error(`Redis unavailable: Switching all queues to local processing mode`);
          
          // Replace this queue with a mock implementation
          this.replaceQueueWithMock(name);
          
          // Also replace any other existing queues that are using Redis
          this.queues.forEach((existingQueue, existingName) => {
            if (existingName !== name) {
              this.replaceQueueWithMock(existingName);
            }
          });
        }
      });
      
      queue.on('failed', (job, error) => {
        console.error(`Job ${job.id} in queue ${name} failed:`, error);
      });
      
      queue.on('stalled', (job) => {
        console.warn(`Job ${job.id} in queue ${name} stalled`);
      });
      
      // Schedule periodic checks for Redis availability
      if (!this.redisCheckIntervalId) {
        this.redisCheckIntervalId = setInterval(() => this.checkRedisAvailability(), 60000); // Check every minute
      }
      
      this.queues.set(name, queue);
      return queue;
    } catch (error) {
      // Log error and increase retry counter
      console.error(`Failed to create queue ${name}:`, error);
      this.redisRetryCount++;
      
      if (this.redisRetryCount >= this.maxRedisRetries) {
        this.redisAvailable = false;
      }
      
      // Create a mock queue for fallback
      const mockQueue = this.createMockQueue(name);
      this.queues.set(name, mockQueue);
      return mockQueue;
    }
  }
  
  // Track the interval ID for Redis checks
  private redisCheckIntervalId: NodeJS.Timeout | null = null;
  
  /**
   * Replace a real queue with a mock implementation
   */
  private replaceQueueWithMock(name: string): void {
    try {
      // Only attempt replacement if the queue exists
      if (this.queues.has(name)) {
        // Try to close the real queue gracefully
        const existingQueue = this.queues.get(name)!;
        existingQueue.close().catch(err => {
          // Just log close errors but continue
          console.warn(`Error closing queue ${name}:`, err);
        });
        
        // Remove it from our map
        this.queues.delete(name);
        
        // Create and add a mock queue
        const mockQueue = this.createMockQueue(name);
        this.queues.set(name, mockQueue);
      }
    } catch (error) {
      console.error(`Error replacing queue ${name} with mock:`, error);
    }
  }
  
  /**
   * Periodically check if Redis has become available again
   */
  private async checkRedisAvailability(): Promise<void> {
    // Skip check if Redis is already available
    if (this.redisAvailable) return;
    
    try {
      // Create a temporary queue to test connection
      const testQueue = new Queue('redis-check', this.defaultQueueOptions);
      
      // Close the queue immediately after successful connection
      await testQueue.close();
      
      console.log('Redis connection restored, will use real queues for new queue requests');
      this.redisAvailable = true;
      this.redisRetryCount = 0;
    } catch (error) {
      // Redis still unavailable, continue in mock mode
      const now = Date.now();
      if (now - this.lastErrorLogTime > this.errorLogThrottleMs * 2) { // Less frequent logging for background checks
        console.warn('Redis still unavailable, continuing in local processing mode');
        this.lastErrorLogTime = now;
      }
    }
  }
  
  /**
   * Add a job to a queue
   */
  public async addJob<T>(
    queueName: string, 
    data: T, 
    options?: JobOptions
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    return queue.add(data, options);
  }
  
  /**
   * Register a processor for a queue
   */
  public processQueue<T>(
    queueName: string, 
    concurrency: number, 
    handler: (job: Job<T>) => Promise<any>
  ): void {
    const queue = this.getQueue(queueName);
    queue.process(concurrency, handler);
  }
  
  /**
   * Get all jobs in a queue with a specific status
   */
  public async getJobs(
    queueName: string, 
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
  ): Promise<Array<Job>> {
    const queue = this.getQueue(queueName);
    return queue.getJobs([status]);
  }
  
  /**
   * Close all queues (useful for graceful shutdown)
   */
  public async closeAll(): Promise<void> {
    // Clear Redis availability check interval
    if (this.redisCheckIntervalId) {
      clearInterval(this.redisCheckIntervalId);
      this.redisCheckIntervalId = null;
    }
    
    // Close all real queues 
    const promises = Array.from(this.queues.values()).map(queue => {
      try {
        return queue.close();
      } catch (error) {
        console.warn(`Error closing queue: ${error}`);
        return Promise.resolve();
      }
    });
    
    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('Error during queue shutdown:', error);
    }
    
    // Clear all queues and processors
    this.queues.clear();
    this.mockProcessors.clear();
    
    console.log('All job queues closed');
  }
}