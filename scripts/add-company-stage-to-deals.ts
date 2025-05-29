import { pool } from "../server/db";

/**
 * This script adds a company_stage column to the deals table to track 
 * the company's funding stage (Seed, Series A, etc.)
 */
async function main() {
  try {
    const client = await pool.connect();

    console.log('Adding company_stage column to deals table...');

    // Check if the column already exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'deals' AND column_name = 'company_stage';
    `;
    
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rows.length === 0) {
      // The column doesn't exist, so add it
      await client.query(`
        ALTER TABLE deals
        ADD COLUMN company_stage TEXT;
      `);
      console.log('✅ Successfully added company_stage column to deals table');
    } else {
      console.log('⚠️ company_stage column already exists in deals table');
    }

    // Release the client back to the pool
    client.release();
    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Make sure the script exits
    process.exit(0);
  }
}

// Execute the script
main();