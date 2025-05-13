import { pool } from '../server/db';

/**
 * This script performs a one-time update to standardize date fields in the database
 * by removing time components and standardizing to noon UTC.
 * 
 * It addresses the issue with dates being stored with inconsistent time components
 * which can lead to timezone-related bugs.
 */
async function main() {
  console.log('Starting date field standardization...');
  
  try {
    // Connect to the database
    const client = await pool.connect();
    try {
      console.log('Connected to database');
      
      // Begin a transaction
      await client.query('BEGIN');
      
      // Standardize dates in capital_calls table
      console.log('Standardizing dates in capital_calls table...');
      const standardizeCapitalCallsDates = `
        UPDATE capital_calls
        SET 
          due_date = DATE_TRUNC('day', due_date) + INTERVAL '12 hours',
          paid_date = CASE 
            WHEN paid_date IS NOT NULL THEN DATE_TRUNC('day', paid_date) + INTERVAL '12 hours'
            ELSE NULL
          END,
          call_date = DATE_TRUNC('day', call_date) + INTERVAL '12 hours'
      `;
      await client.query(standardizeCapitalCallsDates);
      
      // Standardize dates in capital_call_payments table
      console.log('Standardizing dates in capital_call_payments table...');
      const standardizePaymentsDates = `
        UPDATE capital_call_payments
        SET payment_date = DATE_TRUNC('day', payment_date) + INTERVAL '12 hours'
      `;
      await client.query(standardizePaymentsDates);
      
      // Standardize dates in fund_allocations table
      console.log('Standardizing dates in fund_allocations table...');
      const standardizeAllocationsDates = `
        UPDATE fund_allocations
        SET 
          allocation_date = DATE_TRUNC('day', allocation_date) + INTERVAL '12 hours',
          invested_date = CASE 
            WHEN invested_date IS NOT NULL THEN DATE_TRUNC('day', invested_date) + INTERVAL '12 hours'
            ELSE NULL
          END,
          closed_date = CASE 
            WHEN closed_date IS NOT NULL THEN DATE_TRUNC('day', closed_date) + INTERVAL '12 hours'
            ELSE NULL
          END
      `;
      await client.query(standardizeAllocationsDates);
      
      // Standardize dates in closing_schedule_events table
      console.log('Standardizing dates in closing_schedule_events table...');
      const standardizeClosingEventsDates = `
        UPDATE closing_schedule_events
        SET event_date = DATE_TRUNC('day', event_date) + INTERVAL '12 hours'
      `;
      await client.query(standardizeClosingEventsDates);
      
      // Commit the transaction
      await client.query('COMMIT');
      console.log('Date standardization completed successfully');
      
    } catch (error) {
      // Rollback the transaction in case of error
      await client.query('ROLLBACK');
      console.error('Error during date standardization:', error);
      throw error;
      
    } finally {
      // Release the client back to the pool
      client.release();
    }
    
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
  
  // Close the pool
  await pool.end();
  console.log('Database connection closed');
}

// Run the migration
main()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });