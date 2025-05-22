import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * This script adds:
 * 1. A CHECK constraint to ensure call_pct is between 0 and 100
 * 2. A unique composite index on investment_id and due_date for capital_calls
 */
async function main() {
  try {
    console.log('Connecting to the database...');
    
    // First, check if call_pct column exists in capital_calls
    const callPctCheckResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'capital_calls' AND column_name = 'call_pct'
    `);

    if (callPctCheckResult.rows.length === 0) {
      console.log('Adding call_pct column to capital_calls table...');
      // Add call_pct column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE capital_calls 
        ADD COLUMN call_pct real
      `);
      console.log('call_pct column added successfully!');
    } else {
      console.log('call_pct column already exists in capital_calls table.');
    }
    
    // Check if the constraint already exists
    const constraintCheckResult = await db.execute(sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'capital_calls' AND constraint_name = 'capital_calls_call_pct_check'
    `);
    
    if (constraintCheckResult.rows.length === 0) {
      console.log('Adding CHECK constraint for call_pct...');
      await db.execute(sql`
        ALTER TABLE capital_calls
        ADD CONSTRAINT capital_calls_call_pct_check 
        CHECK (call_pct > 0 AND call_pct <= 100)
      `);
      console.log('CHECK constraint added successfully!');
    } else {
      console.log('CHECK constraint already exists.');
    }
    
    // Check if the unique index already exists
    const indexCheckResult = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'capital_calls' AND indexname = 'unique_investment_due_date'
    `);
    
    if (indexCheckResult.length === 0) {
      console.log('Adding unique index on (allocation_id, due_date)...');
      await db.execute(sql`
        CREATE UNIQUE INDEX unique_investment_due_date
        ON capital_calls (allocation_id, due_date)
      `);
      console.log('Unique index added successfully!');
    } else {
      console.log('Unique index already exists.');
    }
    
    // Populate the call_pct column for existing rows with amountType = percentage
    console.log('Populating call_pct for existing percentage-based calls...');
    await db.execute(sql`
      UPDATE capital_calls
      SET call_pct = call_amount
      WHERE amount_type = 'percentage' AND call_pct IS NULL
    `);
    
    // For dollar-based calls, calculate the percentage based on allocation amount
    console.log('Calculating call_pct for dollar-based calls...');
    await db.execute(sql`
      UPDATE capital_calls c
      SET call_pct = (c.call_amount / a.amount) * 100
      FROM fund_allocations a
      WHERE c.allocation_id = a.id
        AND c.amount_type = 'dollar'
        AND c.call_pct IS NULL
        AND a.amount > 0
    `);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

main();