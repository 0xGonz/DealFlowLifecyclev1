import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Add WebSocket support for Neon
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL not set. Database is required for this application.');
}

// Create direct pool/db exports, not nullable anymore
console.log('Initializing database connection...');

// Configure the pool with optimized settings for document access
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3, // Reduced connections for stability
  idleTimeoutMillis: 10000, // 10 seconds
  connectionTimeoutMillis: 5000, // 5 second connection timeout
  allowExitOnIdle: false,
  ssl: { rejectUnauthorized: false }
});

// Set up event handlers for the pool
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  // Don't crash, just log the error
});

pool.on('connect', (client) => {
  client.on('error', (err) => {
    console.error('Database client error:', err);
  });
});

// Test the connection by running a simple query
pool.query('SELECT 1 AS test')
  .then(() => {
    console.log('Database connection verified successfully');
  })
  .catch(err => {
    console.error('Database connection test failed:', err);
    console.error('Continuing with memory storage');
    
    // Attempt to reconnect after a delay
    setTimeout(() => {
      console.log('Attempting to reconnect to database...');
      pool.query('SELECT 1 AS test')
        .then(() => {
          console.log('Database reconnection successful');
        })
        .catch(reconnectErr => {
          console.error('Database reconnection failed:', reconnectErr);
        });
    }, 5000); // Try again after 5 seconds
  });

// Create a function to check pool health periodically
const checkPoolHealth = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database health check passed at:', result.rows[0].now);
  } catch (err) {
    console.error('Database health check failed:', err);
    
    // Attempt reconnection logic
    console.log('Health check failed - attempting to reconnect database pool...');
    
    // Close any existing connections in the pool
    try {
      await pool.end();
      console.log('Successfully closed existing connection pool');
    } catch (endErr) {
      console.error('Error closing connection pool:', endErr);
      // Continue anyway, don't return here
    }
    
    // Create a new pool instance with the same configuration
    try {
      // We can't recreate and reassign the pool here because it's exported
      // But we can try a new connection to test if the database is back
      const testPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 1,
        connectionTimeoutMillis: 10000,
        ssl: { rejectUnauthorized: false }
      });
      
      await testPool.query('SELECT 1');
      console.log('Test connection successful - database is accessible again');
      await testPool.end();
      
      // Refresh a connection in the main pool
      pool.connect().then(client => {
        console.log('Successfully reconnected a client to the main pool');
        client.release();
      }).catch(connErr => {
        console.error('Failed to connect client to main pool:', connErr);
      });
    } catch (testErr) {
      console.error('Test connection failed - database still unavailable:', testErr);
    }
  }
};

// Run health check every 5 minutes
setInterval(checkPoolHealth, 5 * 60 * 1000);

export { pool };
export const db = drizzle(pool, { schema });
console.log('Database connection initialized successfully');
