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
        } else {
          console.log('Using MemStorage (database not available)');
          this.instance = new MemStorage();
        }
      } catch (error) {
        console.error('Error initializing database storage:', error);
        console.log('Falling back to MemStorage');
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
