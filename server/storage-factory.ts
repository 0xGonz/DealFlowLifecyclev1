import { IStorage, MemStorage } from './storage';
import { DatabaseStorage } from './database-storage';
import { db, isDatabaseHealthy } from './db';

/**
 * StorageFactory provides a modular and resilient way to manage storage implementations,
 * making the application more scalable by abstracting storage details from business logic.
 * 
 * This factory pattern allows for:
 * 1. Dynamic switching between storage implementations (DB vs Memory)
 * 2. Graceful degradation when database connectivity fails
 * 3. Easier testing through dependency injection
 * 4. Future extensibility for additional storage types
 */
export class StorageFactory {
  private static instance: IStorage;
  private static memoryFallbackInstance: MemStorage;
  static storage: IStorage; // Public accessor for convenience
  
  // Storage implementation types for extension
  private static readonly STORAGE_TYPES = {
    DATABASE: 'database',
    MEMORY: 'memory',
    // Future storage types can be added here (e.g., REDIS, ELASTICSEARCH, etc.)
  };

  private static activeStorageType: string = StorageFactory.STORAGE_TYPES.DATABASE;
  private static healthCheckInterval: NodeJS.Timeout | null = null;
  private static readonly HEALTH_CHECK_INTERVAL_MS = 30000; // 30 seconds
  
  /**
   * Get the appropriate storage implementation based on environment and availability
   * Uses database by default with graceful fallback to memory storage
   * 
   * @returns A Promise that resolves to the IStorage instance
   * @remarks
   * This method is async to support potential future async storage initialization.
   * Currently, the initialization is synchronous, but the async interface provides
   * forward compatibility.
   */
  public static async getStorage(): Promise<IStorage> {
    // Always ensure we have a memory fallback instance
    if (!this.memoryFallbackInstance) {
      this.memoryFallbackInstance = new MemStorage();
    }
    
    // If we already have an instance and it's the database storage, double-check it's healthy
    if (this.instance && this.activeStorageType === this.STORAGE_TYPES.DATABASE) {
      // For database storage, verify the connection is still good before returning
      if (!isDatabaseHealthy()) {
        console.log('Database connection lost - switching to memory storage');
        // Switch to memory storage
        if (!this.memoryFallbackInstance) {
          this.memoryFallbackInstance = new MemStorage();
        }
        this.instance = this.memoryFallbackInstance;
        this.storage = this.instance;
        this.activeStorageType = this.STORAGE_TYPES.MEMORY;
        
        // Start health checks if not already running
        if (!this.healthCheckInterval) {
          this.startHealthCheck();
        }
      }
    }

    // If we don't have any instance at all, try to create one
    if (!this.instance) {
      try {
        // First, check database availability with a forceful check
        // This ensures we have the most up-to-date status
        const dbAvailable = isDatabaseHealthy();
        
        if (dbAvailable) {
          console.log('Using DatabaseStorage - database connection is healthy');
          this.instance = new DatabaseStorage();
          this.activeStorageType = this.STORAGE_TYPES.DATABASE;
        } else {
          console.log('Using MemStorage - database connection unavailable');
          this.instance = this.memoryFallbackInstance;
          this.activeStorageType = this.STORAGE_TYPES.MEMORY;
        }
        
        // Start health check regardless of initial status
        this.startHealthCheck();
      } catch (error) {
        console.error('Error initializing storage:', error);
        console.log('Falling back to MemStorage due to initialization error');
        this.instance = this.memoryFallbackInstance || new MemStorage();
        this.activeStorageType = this.STORAGE_TYPES.MEMORY;
        this.startHealthCheck();
      }
    }
    
    // Set the static storage property to the instance for easier access
    this.storage = this.instance;
    return this.instance;
  }
  
  /**
   * Get the storage implementation synchronously - for internal use only
   * This method should only be used when async/await cannot be used
   * Prefer using the async getStorage() method whenever possible
   */
  public static getStorageSync(): IStorage {
    if (!this.instance) {
      if (!this.memoryFallbackInstance) {
        this.memoryFallbackInstance = new MemStorage();
      }
      
      // For sync access, we'll just use memory storage if we don't have an instance yet
      // to avoid any potential blocking operations
      this.instance = this.memoryFallbackInstance;
      this.activeStorageType = this.STORAGE_TYPES.MEMORY;
      
      // Kick off an async initialization that will switch to DB if available
      this.getStorage().catch(err => {
        console.error('Async storage initialization failed:', err);
      });
    }
    
    return this.instance;
  }

  /**
   * Start periodic health checks to recover database if it becomes available again
   */
  private static startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL_MS);
  }
  
  /**
   * Perform a health check to verify the database is available
   * Will automatically switch back to database storage if it was previously unavailable
   */
  private static async performHealthCheck(): Promise<void> {
    // Only check if we're currently using memory storage
    if (this.activeStorageType === this.STORAGE_TYPES.MEMORY) {
      if (isDatabaseHealthy()) {
        console.log('Database connection restored - switching back to DatabaseStorage');
        this.instance = new DatabaseStorage();
        this.storage = this.instance;
        this.activeStorageType = this.STORAGE_TYPES.DATABASE;
      }
    } 
    // If we're using database but it's unhealthy, switch to memory
    else if (this.activeStorageType === this.STORAGE_TYPES.DATABASE && !isDatabaseHealthy()) {
      console.log('Database connection lost - switching to MemStorage fallback');
      if (!this.memoryFallbackInstance) {
        this.memoryFallbackInstance = new MemStorage();
      }
      this.instance = this.memoryFallbackInstance;
      this.storage = this.instance;
      this.activeStorageType = this.STORAGE_TYPES.MEMORY;
    }
  }

  /**
   * Get the active storage type (useful for diagnostics and monitoring)
   */
  public static getActiveStorageType(): string {
    return this.activeStorageType;
  }

  /**
   * Set a specific storage implementation (useful for testing and dependency injection)
   */
  public static setStorage(storage: IStorage): void {
    this.instance = storage;
    this.storage = storage;
    
    // Detect storage type
    if (storage instanceof DatabaseStorage) {
      this.activeStorageType = this.STORAGE_TYPES.DATABASE;
    } else if (storage instanceof MemStorage) {
      this.activeStorageType = this.STORAGE_TYPES.MEMORY;
    }
  }

  /**
   * Reset the storage instance (useful for testing and clearing state)
   */
  public static resetStorage(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.instance = undefined as unknown as IStorage;
    this.storage = undefined as unknown as IStorage;
    this.memoryFallbackInstance = undefined as unknown as MemStorage;
    this.activeStorageType = this.STORAGE_TYPES.DATABASE; // Default to database
  }
  
  /**
   * Stop health checks (for shutdown or testing)
   */
  public static stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}
