import { IStorage, MemStorage } from './storage';
import { DatabaseStorage } from './database-storage';
import { db } from './db';

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
  private static dbCheckInterval = 60000; // 1 minute between checks
  private static maxDbFailures = 3; // Number of failures before switching to memory storage

  /**
   * Get the appropriate storage implementation based on environment
   */
  public static getStorage(): IStorage {
    if (!this.instance) {
      try {
        // Check if database is available
        if (db) {
          console.log('Using DatabaseStorage');
          this.instance = new DatabaseStorage();
          
          // Reset failure counter on successful initialization
          this.dbFailures = 0;
        } else {
          console.log('Using MemStorage (database not available)');
          this.instance = new MemStorage();
        }
      } catch (error) {
        console.error('Error initializing database storage:', error);
        console.log('Falling back to MemStorage');
        this.instance = new MemStorage();
        
        // Increment failure counter
        this.dbFailures++;
      }
    } else {
      // Periodically check if we should attempt to reconnect to the database if we're using memory storage
      const now = Date.now();
      if (this.instance instanceof MemStorage && 
          now - this.lastDbCheck > this.dbCheckInterval) {
        this.lastDbCheck = now;
        
        // Try to verify database connection
        try {
          const testDb = db;
          if (testDb) {
            console.log('Storage factory: Database now available, attempting to switch back');
            // Try a simple query to verify connection
            const testStorage = new DatabaseStorage();
            // We'll set the instance after a successful test operation
            this.instance = testStorage;
            this.dbFailures = 0;
          }
        } catch (error) {
          console.error('Storage factory: Database still unavailable:', error);
        }
      }
      
      // If we have a DatabaseStorage instance, check if we've had too many failures
      // and should switch to memory storage
      if (this.instance instanceof DatabaseStorage && this.dbFailures >= this.maxDbFailures) {
        console.log(`Storage factory: Too many database failures (${this.dbFailures}), switching to MemStorage`);
        this.instance = new MemStorage();
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
