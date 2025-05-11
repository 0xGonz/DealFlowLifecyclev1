import { db, pool } from '../server/db';
import path from 'path';

/**
 * This script adds the amount_type column to capital_calls table
 * and creates the closing_schedule_events table if it doesn't exist.
 * 
 * This fixes the 500 errors on the capital-calls and closing-schedules endpoints.
 */
async function main() {
  try {
    console.log('Connecting to the database...');
    // We're using the existing pool from server/db.ts

    console.log('Checking if amount_type column exists in capital_calls table...');
    
    // First, check if amount_type column exists in capital_calls
    const amountTypeCheckResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'capital_calls' AND column_name = 'amount_type'
    `);
    
    const amountTypeCheck = amountTypeCheckResult.rows;

    if (amountTypeCheck.length === 0) {
      console.log('Adding amount_type column to capital_calls table...');
      // Add amount_type column if it doesn't exist
      await pool.query(`
        ALTER TABLE capital_calls 
        ADD COLUMN amount_type text DEFAULT 'percentage'
      `);
      console.log('amount_type column added successfully!');
    } else {
      console.log('amount_type column already exists in capital_calls table.');
    }

    console.log('Checking if closing_schedule_events table exists...');
    
    // Check if closing_schedule_events table exists
    const tableCheckResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'closing_schedule_events'
    `);
    
    const tableCheck = tableCheckResult.rows;

    if (tableCheck.length === 0) {
      console.log('Creating closing_schedule_events table...');
      // Create closing_schedule_events table if it doesn't exist
      await pool.query(`
        CREATE TABLE closing_schedule_events (
          id serial PRIMARY KEY,
          deal_id integer NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
          event_type text NOT NULL,
          event_name text NOT NULL,
          scheduled_date timestamp NOT NULL,
          actual_date timestamp,
          target_amount real,
          amount_type text DEFAULT 'percentage',
          actual_amount real,
          status text NOT NULL DEFAULT 'scheduled',
          notes text,
          created_by integer NOT NULL REFERENCES users(id),
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);
      console.log('closing_schedule_events table created successfully!');
    } else {
      console.log('closing_schedule_events table already exists.');
    }

    console.log('Migration completed successfully!');
    await pool.end(); // Close the pool connection
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    try {
      await pool.end(); // Try to close the pool even on error
    } catch (e) {
      console.error('Error closing pool:', e);
    }
    process.exit(1);
  }
}

main();