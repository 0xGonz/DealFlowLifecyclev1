import { pool } from '../server/db';
import * as pg from 'pg';

/**
 * This script updates the validation limits for the fund_allocations table
 * to support larger investment amounts, without dropping any tables
 */
async function main() {
  let client: pg.PoolClient | null = null;
  
  try {
    console.log('Updating allocation limits...');
    
    // Get a client from the pool
    client = await pool.connect();
    
    // Instead of drizzle push which would try to drop tables,
    // we'll use SQL to modify the column type, preserving data
    await client.query(`
      -- First ensure amount is of proper type (it's already real/float but we'll be explicit)
      ALTER TABLE fund_allocations 
      ALTER COLUMN amount TYPE DOUBLE PRECISION;
      
      -- Update other amount fields that might need to handle large amounts
      ALTER TABLE capital_calls 
      ALTER COLUMN call_amount TYPE DOUBLE PRECISION;
      
      ALTER TABLE closing_schedule_events 
      ALTER COLUMN target_amount TYPE DOUBLE PRECISION;
      
      ALTER TABLE closing_schedule_events 
      ALTER COLUMN actual_amount TYPE DOUBLE PRECISION;
    `);
    
    console.log('Successfully updated allocation limits to support larger investment amounts');
  } catch (error) {
    console.error('Error updating allocation limits:', error);
  } finally {
    // Release the client back to the pool
    if (client) client.release();
    // We're not going to end the pool here as it would terminate the connection for other operations
  }
}

main();