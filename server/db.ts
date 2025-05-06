import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

/**
 * Database connection module that provides centralized database connectivity
 * with built-in resilience, connection pooling, and error handling.
 */
class DatabaseConnection {
  private static instance: DatabaseConnection;
  private _pool: Pool | null = null;
  private _db: ReturnType<typeof drizzle> | null = null;
  private _isHealthy: boolean = false;
  private _lastError: Error | null = null;
  private _reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY_MS = 2000;

  private constructor() {
    // Initialize synchronously to avoid complications with async constructors
    this.initializeSync();
  }
  
  /**
   * Initialize synchronously (for constructor use)
   */
  private initializeSync(): void {
    try {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL not set. Database is required for this application.');
      }

      console.log('Initializing database connection...');
      
      // Configure pool with extremely conservative settings for maximum stability
      this._pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 3,                       // Very small pool size to avoid connection limits
        idleTimeoutMillis: 300000,    // Increased to 5 minutes to reduce reconnection cycles
        connectionTimeoutMillis: 20000, // Increased to 20 seconds to allow for slow networks
        allowExitOnIdle: false,       // Never exit on idle
        ssl: { rejectUnauthorized: false }, // Required for hosted databases
        statement_timeout: 30000,     // 30 seconds for statements
        query_timeout: 30000,         // 30 seconds for queries
      });

      // Set up connection event handlers
      this._pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
        this._isHealthy = false;
        this._lastError = err;
        this.attemptReconnect();
      });

      // Set up connection observer
      this._pool.on('connect', (client) => {
        console.log('New database connection established');
        client.on('error', (err) => {
          console.error('Database client error:', err);
        });
      });

      // Initialize Drizzle ORM with our schema
      this._db = drizzle(this._pool, { schema });
      
      // Verify connection later (not in constructor)
      // We'll do this on first query or when explicitly requested
      setTimeout(() => this.verifyConnection(), 100);
      
    } catch (error) {
      console.error('Error initializing database connection:', error);
      this._isHealthy = false;
      this._lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Get the singleton instance of DatabaseConnection
   */
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Initialize database connection with robust configuration
   */
  private async initialize(): Promise<void> {
    try {
      // Check if we already have an active pool
      if (this._pool) {
        try {
          // Check if the existing pool is still usable
          await this._pool.query('SELECT 1');
          console.log('Reusing existing database connection pool');
          return; // Existing pool is working, no need to recreate
        } catch (err) {
          console.log('Existing pool is not usable, will create a new one');
          // The existing pool is not usable, proceed to create a new one
          try {
            await this._pool.end();
          } catch (endError) {
            console.error('Error ending existing pool:', endError);
          }
          this._pool = null;
          this._db = null;
        }
      }

      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL not set. Database is required for this application.');
      }

      console.log('Creating new database connection pool...');
      
      // Use the same extreme conservation settings as in initializeSync
      this._pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 3,                       // Very small pool size to avoid connection limits
        idleTimeoutMillis: 300000,    // Increased to 5 minutes to reduce reconnection cycles
        connectionTimeoutMillis: 20000, // Increased to 20 seconds to allow for slow networks
        allowExitOnIdle: false,       // Never exit on idle
        ssl: { rejectUnauthorized: false }, // Required for hosted databases
        statement_timeout: 30000,     // 30 seconds for statements
        query_timeout: 30000,         // 30 seconds for queries
      });

      // Set up connection event handlers
      this._pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
        this._isHealthy = false;
        this._lastError = err;
        this.attemptReconnect();
      });

      // Set up connection observer
      this._pool.on('connect', (client) => {
        console.log('New database connection established');
        client.on('error', (err) => {
          console.error('Database client error:', err);
        });
      });

      // Initialize Drizzle ORM with our schema
      this._db = drizzle(this._pool, { schema });
      
      // Verify connection immediately and wait for result
      const connectionValid = await this.verifyConnection();
      
      if (connectionValid) {
        console.log('Database connection verified and ready');
      } else {
        console.warn('Database connection initialized but health check failed');
      }
    } catch (error) {
      console.error('Error initializing database connection:', error);
      this._isHealthy = false;
      this._lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Verify database connection by running a test query with multiple retry attempts
   */
  public async verifyConnection(): Promise<boolean> {
    if (!this._pool) return false;
    
    // Try multiple times before giving up - this helps with temporary network glitches
    const maxAttempts = 3;
    const delayBetweenAttempts = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Use a simple query to detect connection issues
        await this._pool.query('SELECT 1 AS test');
        
        // Only log if health status changes to avoid log spam
        if (!this._isHealthy) {
          console.log('Database connection verified successfully - connectivity restored');
        }
        
        this._isHealthy = true;
        this._reconnectAttempts = 0;
        return true;
      } catch (err) {
        // Only log detailed error on first attempt to avoid spam
        if (attempt === 1) {
          console.error(`Database connection test failed (attempt ${attempt}/${maxAttempts}):`, err);
        } else {
          console.log(`Database connection test retry failed (attempt ${attempt}/${maxAttempts})`);
        }
        
        // If not the last attempt, wait before trying again
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
        } else {
          // This was the last attempt, mark as unhealthy
          if (this._isHealthy) {
            console.error('All database connection verification attempts failed');
          }
          
          this._isHealthy = false;
          this._lastError = err instanceof Error ? err : new Error(String(err));
          this.attemptReconnect();
        }
      }
    }
    
    return false;
  }

  /**
   * Attempt to reconnect to the database after failure with exponential backoff
   */
  private attemptReconnect(): void {
    if (this._reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error(`Maximum reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
      return;
    }

    this._reconnectAttempts++;
    
    // Use exponential backoff to avoid hammering the database during outages
    // Start with 2 seconds, then 4, 8, 16, 32 seconds between attempts
    const backoffDelayMs = this.RECONNECT_DELAY_MS * Math.pow(2, this._reconnectAttempts - 1);
    const cappedDelayMs = Math.min(backoffDelayMs, 60000); // Cap at 1 minute
    
    console.log(`Attempting to reconnect to database (attempt ${this._reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}) in ${cappedDelayMs / 1000} seconds...`);
    
    setTimeout(() => {
      this.initialize();
    }, cappedDelayMs);
  }

  /**
   * Get database connection pool
   */
  public get pool(): Pool {
    if (!this._pool) {
      this.initialize();
      if (!this._pool) {
        throw new Error('Failed to initialize database pool');
      }
    }
    return this._pool;
  }

  /**
   * Get Drizzle ORM instance
   */
  public get db(): ReturnType<typeof drizzle> {
    if (!this._db) {
      this.initialize();
      if (!this._db) {
        throw new Error('Failed to initialize Drizzle ORM');
      }
    }
    return this._db;
  }

  /**
   * Check if the database connection is healthy
   */
  public get isHealthy(): boolean {
    return this._isHealthy;
  }

  /**
   * Get the last error that occurred with the database connection
   */
  public get lastError(): Error | null {
    return this._lastError;
  }

  /**
   * Close all database connections cleanly (for shutdown)
   */
  public async closeConnections(): Promise<void> {
    if (this._pool) {
      console.log('Closing all database connections...');
      await this._pool.end();
      this._pool = null;
      this._db = null;
      this._isHealthy = false;
      console.log('All database connections closed');
    }
  }
}

// Create and export the singleton database connection
const dbConnection = DatabaseConnection.getInstance();

// Export the pool and DB for backward compatibility
export const pool = dbConnection.pool;
export const db = dbConnection.db; 

// Expose health check method for monitoring
export const isDatabaseHealthy = () => dbConnection.isHealthy;
