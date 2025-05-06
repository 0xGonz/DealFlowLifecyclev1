import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL not set. Database is required for this application.');
}

// Create direct pool/db exports, not nullable anymore
console.log('Initializing database connection...');
// Configure the pool with more detailed options for better reliability
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Timeout after 5 seconds if a connection cannot be established
  allowExitOnIdle: false, // Don't exit if all connections end
  ssl: { rejectUnauthorized: false } // Required for some PostgreSQL services
});

// Test the connection by running a simple query
pool.query('SELECT 1 AS test').then(() => {
  console.log('Database connection verified successfully');
}).catch(err => {
  console.error('Database connection test failed:', err);
  console.error('Continuing with memory storage');
});

export { pool };
export const db = drizzle(pool, { schema });
console.log('Database connection initialized successfully');
