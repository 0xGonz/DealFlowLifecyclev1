import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * This script adds the amount_type column to capital_calls table
 * and creates the closing_schedule_events table if it doesn't exist.
 * 
 * This fixes the 500 errors on the capital-calls and closing-schedules endpoints.
 */
async function main() {
  try {
    console.log('Connecting to the database...');

    console.log('Checking if amount_type column exists in capital_calls table...');
    
    // First, check if amount_type column exists in capital_calls
    const amountTypeCheckResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'capital_calls' AND column_name = 'amount_type'
    `);

    if (amountTypeCheckResult.rows.length === 0) {
      console.log('Adding amount_type column to capital_calls table...');
      // Add amount_type column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE capital_calls 
        ADD COLUMN amount_type text DEFAULT 'percentage'
      `);
      console.log('amount_type column added successfully!');
    } else {
      console.log('amount_type column already exists in capital_calls table.');
    }

    console.log('Checking if closing_schedule_events table exists...');
    
    // Check if closing_schedule_events table exists
    const tableCheckResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'closing_schedule_events'
    `);

    if (tableCheckResult.rows.length === 0) {
      console.log('Creating closing_schedule_events table...');
      // Create closing_schedule_events table if it doesn't exist
      await db.execute(sql`
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
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

main();