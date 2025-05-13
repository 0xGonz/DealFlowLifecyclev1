import { db, pool } from '../server/db';
import path from 'path';
import * as fs from 'fs';

/**
 * This script adds:
 * 1. A CHECK constraint to ensure call_pct is between 0 and 100
 * 2. A unique composite index on investment_id and due_date for capital_calls
 */
async function main() {
  try {
    console.log('Connecting to the database...');
    
    // First, check if call_pct column exists in capital_calls
    const callPctCheckResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'capital_calls' AND column_name = 'call_pct'
    `);
    
    const callPctCheck = callPctCheckResult.rows;

    if (callPctCheck.length === 0) {
      console.log('Adding call_pct column to capital_calls table...');
      // Add call_pct column if it doesn't exist
      await pool.query(`
        ALTER TABLE capital_calls 
        ADD COLUMN call_pct real
      `);
      console.log('call_pct column added successfully!');
    } else {
      console.log('call_pct column already exists in capital_calls table.');
    }
    
    // Check if the constraint already exists
    const constraintCheckResult = await pool.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'capital_calls' AND constraint_name = 'capital_calls_call_pct_check'
    `);
    
    const constraintCheck = constraintCheckResult.rows;
    
    if (constraintCheck.length === 0) {
      console.log('Adding CHECK constraint for call_pct...');
      await pool.query(`
        ALTER TABLE capital_calls
        ADD CONSTRAINT capital_calls_call_pct_check 
        CHECK (call_pct > 0 AND call_pct <= 100)
      `);
      console.log('CHECK constraint added successfully!');
    } else {
      console.log('CHECK constraint already exists.');
    }
    
    // Check if the unique index already exists
    const indexCheckResult = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'capital_calls' AND indexname = 'unique_investment_due_date'
    `);
    
    const indexCheck = indexCheckResult.rows;
    
    if (indexCheck.length === 0) {
      console.log('Adding unique index on (allocation_id, due_date)...');
      await pool.query(`
        CREATE UNIQUE INDEX unique_investment_due_date
        ON capital_calls (allocation_id, due_date)
      `);
      console.log('Unique index added successfully!');
    } else {
      console.log('Unique index already exists.');
    }
    
    // Populate the call_pct column for existing rows with amountType = percentage
    console.log('Populating call_pct for existing percentage-based calls...');
    await pool.query(`
      UPDATE capital_calls
      SET call_pct = call_amount
      WHERE amount_type = 'percentage' AND call_pct IS NULL
    `);
    
    // For dollar-based calls, calculate the percentage based on allocation amount
    console.log('Calculating call_pct for dollar-based calls...');
    await pool.query(`
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
  } finally {
    await pool.end();
  }
}

main();