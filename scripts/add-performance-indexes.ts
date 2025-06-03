/**
 * Performance optimization script
 * Adds database indexes to eliminate N+1 queries identified in the audit
 */

import { pool } from '../server/db.js';

async function addPerformanceIndexes() {
  const client = await pool.connect();
  
  try {
    console.log('Adding performance indexes...');
    
    // Index for capital_calls allocation_id and status - fixes N+1 queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_capital_calls_allocation_status 
      ON capital_calls (allocation_id, status);
    `);
    console.log('✓ Added index: capital_calls (allocation_id, status)');
    
    // Index for fund_allocations fund_id - speeds up fund queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fund_allocations_fund_id 
      ON fund_allocations (fund_id);
    `);
    console.log('✓ Added index: fund_allocations (fund_id)');
    
    // Index for fund_allocations deal_id - speeds up deal queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fund_allocations_deal_id 
      ON fund_allocations (deal_id);
    `);
    console.log('✓ Added index: fund_allocations (deal_id)');
    
    // Composite index for status-based queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fund_allocations_status_amount 
      ON fund_allocations (status, amount);
    `);
    console.log('✓ Added index: fund_allocations (status, amount)');
    
    // Index for timeline events by deal_id
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_timeline_events_deal_id 
      ON timeline_events (deal_id, created_at DESC);
    `);
    console.log('✓ Added index: timeline_events (deal_id, created_at)');
    
    console.log('All performance indexes added successfully!');
    
  } catch (error) {
    console.error('Error adding performance indexes:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addPerformanceIndexes()
    .then(() => {
      console.log('Performance optimization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Performance optimization failed:', error);
      process.exit(1);
    });
}

export { addPerformanceIndexes };