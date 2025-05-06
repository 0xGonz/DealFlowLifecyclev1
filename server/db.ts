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
      
      // Configure pool with more conservative settings for stability
      this._pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,                      // Reduce maximum connections to avoid overloading the database
        idleTimeoutMillis: 60000,     // Increased to 1 minute for better efficiency
        connectionTimeoutMillis: 10000, // Increased to 10 seconds to allow for network latency
        allowExitOnIdle: false,       // Prevent application from exiting when idle
        ssl: { rejectUnauthorized: false }, // Required for some hosted databases
        statement_timeout: 15000,     // Increase to 15 seconds
        query_timeout: 20000,         // Increase to 20 seconds
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
      
      // Use the same configuration as in initializeSync for consistency
      this._pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,                      // Reduce maximum connections to avoid overloading the database
        idleTimeoutMillis: 60000,     // Increased to 1 minute for better efficiency
        connectionTimeoutMillis: 10000, // Increased to 10 seconds to allow for network latency
        allowExitOnIdle: false,       // Prevent application from exiting when idle
        ssl: { rejectUnauthorized: false }, // Required for some hosted databases
        statement_timeout: 15000,     // Increase to 15 seconds
        query_timeout: 20000,         // Increase to 20 seconds
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
   * Verify database connection by running a test query
   */
  public async verifyConnection(): Promise<boolean> {
    if (!this._pool) return false;
    
    try {
      await this._pool.query('SELECT 1 AS test');
      
      // Only log if health status changes to avoid log spam
      if (!this._isHealthy) {
        console.log('Database connection verified successfully - connectivity restored');
      }
      
      this._isHealthy = true;
      this._reconnectAttempts = 0;
      return true;
    } catch (err) {
      // Only log if health status changes to avoid log spam
      if (this._isHealthy) {
        console.error('Database connection test failed:', err);
      }
      
      this._isHealthy = false;
      this._lastError = err instanceof Error ? err : new Error(String(err));
      this.attemptReconnect();
      return false;
    }
  }

  /**
   * Attempt to reconnect to the database after failure
   */
  private attemptReconnect(): void {
    if (this._reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error(`Maximum reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
      return;
    }

    this._reconnectAttempts++;
    console.log(`Attempting to reconnect to database (attempt ${this._reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
    
    setTimeout(() => {
      this.initialize();
    }, this.RECONNECT_DELAY_MS);
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
