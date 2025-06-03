import { Pool } from 'pg';

/**
 * This script adds database-level constraints to prevent duplicate allocations
 * and ensures data integrity at the database level, not just application level.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const client = new Pool({ connectionString });

  try {
    console.log('🔒 Adding database constraints to prevent duplicate allocations...');

    // Add unique constraint to prevent duplicate allocations per fund/deal combination
    await client.query(`
      ALTER TABLE fund_allocations 
      ADD CONSTRAINT unique_fund_deal_allocation 
      UNIQUE (fund_id, deal_id, allocation_date);
    `);
    console.log('✅ Added unique constraint for fund_id + deal_id + allocation_date');

    // Add check constraint to ensure amount is positive
    await client.query(`
      ALTER TABLE fund_allocations 
      ADD CONSTRAINT positive_allocation_amount 
      CHECK (amount > 0);
    `);
    console.log('✅ Added check constraint for positive allocation amounts');

    // Add check constraint to ensure market_value is non-negative
    await client.query(`
      ALTER TABLE fund_allocations 
      ADD CONSTRAINT non_negative_market_value 
      CHECK (market_value >= 0);
    `);
    console.log('✅ Added check constraint for non-negative market values');

    // Add unique constraint to prevent duplicate capital calls for same allocation/date
    await client.query(`
      ALTER TABLE capital_calls 
      ADD CONSTRAINT unique_allocation_call_date 
      UNIQUE (allocation_id, call_date);
    `);
    console.log('✅ Added unique constraint for allocation_id + call_date in capital_calls');

    console.log('🎉 Database constraints successfully added!');
    
  } catch (error) {
    console.error('❌ Error adding constraints:', error);
    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main };