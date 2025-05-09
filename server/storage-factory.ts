import { IStorage, MemStorage } from './storage';
import { DatabaseStorage } from './database-storage';
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
      // Calculate backoff interval based on recovery attempts
      const currentInterval = this.recoveryAttempts === 0 
        ? this.dbCheckInterval 
        : Math.min(
            this.baseRecoveryInterval * Math.pow(this.recoveryBackoffFactor, this.recoveryAttempts),
            60000 // Cap at 1 minute max
          );
          
      if (this.instance instanceof MemStorage && 
          now - this.lastDbCheck > currentInterval &&
          this.recoveryAttempts < this.maxRecoveryAttempts) {
        this.lastDbCheck = now;
        this.recoveryAttempts++;
        
        // Try to verify database connection with exponential backoff
        try {
          console.log(`Storage factory: Recovery attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts} after ${Math.round(currentInterval/1000)}s`);
          
          // Use a test query to validate the database is really available
          const testDb = db;
          if (testDb) {
            // Attempting an actual query to verify connection is live
            pool.query('SELECT 1 AS test')
              .then(() => {
                console.log('Storage factory: Database now confirmed available, switching back to DatabaseStorage');
                // Create a new database storage instance
                const testStorage = new DatabaseStorage();
                // We'll set the instance after a successful test operation
                this.instance = testStorage;
                this.dbFailures = 0;
                this.recoveryAttempts = 0; // Reset recovery attempts on success
                console.log('Successfully switched back to database storage');
              })
              .catch(error => {
                console.error('Storage factory: Database query test failed:', error);
              });
          }
        } catch (error) {
          console.error('Storage factory: Database still unavailable (recovery attempt failed):', error);
        }
      } else if (this.recoveryAttempts >= this.maxRecoveryAttempts && this.instance instanceof MemStorage) {
        // If we've reached max recovery attempts, only check occasionally
        if (now - this.lastDbCheck > 5 * 60 * 1000) { // Check every 5 minutes after max attempts
          this.lastDbCheck = now;
          console.log('Storage factory: Max recovery attempts reached, checking database less frequently');
          
          // Still try occasionally
          try {
            const testDb = db;
            if (testDb) {
              pool.query('SELECT 1 AS test')
                .then(() => {
                  console.log('Storage factory: Database available again after extended outage');
                  this.instance = new DatabaseStorage();
                  this.dbFailures = 0;
                  this.recoveryAttempts = 0;
                })
                .catch(() => {
                  console.log('Storage factory: Database still unavailable after extended outage');
                });
            }
          } catch (error) {
            console.error('Storage factory: Database still unavailable after extended outage:', error);
          }
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
