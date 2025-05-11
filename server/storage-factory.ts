import { IStorage, MemStorage } from './storage';
import { DatabaseStorage } from './database-storage';
import { HybridStorage } from './hybrid-storage';
import { db, pool } from './db';

/**
 * StorageFactory provides a way to easily switch between different storage implementations
 * This makes the application more modular and easier to test
 */
export class StorageFactory {
  private static instance: IStorage;
  static storage: IStorage;

  // Cache to track consecutive database failures
  private static dbFailures = 0;
  private static lastDbCheck = 0;
  private static dbCheckInterval = 30000; // 30 seconds between checks (more frequent)
  private static maxDbFailures = 3; // Number of failures before switching to memory storage
  private static recoveryAttempts = 0;
  private static maxRecoveryAttempts = 20; // Try to recover for a while before giving up
  private static recoveryBackoffFactor = 1.5; // Exponential backoff factor
  private static baseRecoveryInterval = 5000; // Start with 5 seconds between recovery attempts

  /**
   * Get the appropriate storage implementation based on environment
   */
  public static getStorage(): IStorage {
    if (!this.instance) {
      try {
        // Use the new HybridStorage for better reliability
        console.log('Using HybridStorage for improved data persistence');
        this.instance = new HybridStorage();
          
        // Reset failure counter on successful initialization
        this.dbFailures = 0;
        this.recoveryAttempts = 0;
      } catch (error) {
        console.error('Error initializing hybrid storage:', error);
        console.log('Falling back to MemStorage as last resort');
        this.instance = new MemStorage();
        
        // Increment failure counter
        this.dbFailures++;
      }
    }
    
    // Set the static storage property to the instance for easier access
    this.storage = this.instance;
    return this.instance;
  }

  /**
   * Set a specific storage implementation (useful for testing)
   */
  public static setStorage(storage: IStorage): void {
    this.instance = storage;
    this.storage = storage;
  }

  /**
   * Reset the storage instance (useful for testing)
   */
  public static resetStorage(): void {
    this.instance = undefined as unknown as IStorage;
    this.storage = undefined as unknown as IStorage;
  }
}
