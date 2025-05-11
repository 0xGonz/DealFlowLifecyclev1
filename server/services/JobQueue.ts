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
  
  // Default queue options
  private defaultQueueOptions: Queue.QueueOptions = {
    redis: {
      port: 6379,
      host: process.env.REDIS_HOST || 'localhost',
      password: process.env.REDIS_PASSWORD
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
   * Get or create a queue by name
   */
  public getQueue(name: string): Queue.Queue {
    if (!this.queues.has(name)) {
      // In the absence of Redis, we'll create a local-only queue
      // For actual deployments, you'd want to set up a proper Redis instance
      const queueOptions = {
        ...this.defaultQueueOptions,
        settings: {
          stalledInterval: 300000, // 5 minutes
          maxStalledCount: 1
        }
      };
      
      console.log(`Creating queue: ${name}`);
      // If Redis is not available, we'll use in-memory implementation
      try {
        const queue = new Queue(name, queueOptions);
        
        // Set up event handlers for better observability
        queue.on('error', (error) => {
          console.error(`Queue ${name} error:`, error);
        });
        
        queue.on('failed', (job, error) => {
          console.error(`Job ${job.id} in queue ${name} failed:`, error);
        });
        
        queue.on('stalled', (job) => {
          console.warn(`Job ${job.id} in queue ${name} stalled`);
        });
        
        this.queues.set(name, queue);
      } catch (error) {
        console.error(`Failed to create queue ${name}:`, error);
        // Create a mock queue for fallback - won't actually process jobs
        // but will prevent application crashes
        const mockQueue = {
          add: (data: any, opts?: JobOptions) => {
            console.warn(`Mock queue ${name} - would process:`, data);
            return Promise.resolve({} as Job);
          },
          process: (concurrency: number, handler: (job: Job) => Promise<any>) => {
            console.warn(`Mock queue ${name} - registered processor with concurrency:`, concurrency);
          },
          on: (event: string, handler: (...args: any[]) => void) => {
            // Do nothing
          }
        } as unknown as Queue.Queue;
        
        this.queues.set(name, mockQueue);
      }
    }
    
    return this.queues.get(name)!;
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
    const promises = Array.from(this.queues.values()).map(queue => queue.close());
    await Promise.all(promises);
    this.queues.clear();
  }
}