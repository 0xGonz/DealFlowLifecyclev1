import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Adding amountType column to fund_allocations table...');
  
  try {
    // Check if column already exists
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='fund_allocations' AND column_name='amount_type'
    `);
    
    if (result.rows.length === 0) {
      console.log('Column does not exist, adding it...');
      
      // Add the column with a default value
      await db.execute(sql`
        ALTER TABLE fund_allocations 
        ADD COLUMN amount_type TEXT DEFAULT 'dollar' NOT NULL
      `);
      
      console.log('Column added successfully!');
    } else {
      console.log('Column already exists, skipping.');
    }
  } catch (error) {
    console.error('Error adding column:', error);
    process.exit(1);
  }
  
  console.log('Migration completed successfully.');
  process.exit(0);
}

main();