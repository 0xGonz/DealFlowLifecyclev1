import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Adding amount_type column to capital_calls table...');
  
  try {
    // Add amount_type column to capital_calls if it doesn't exist
    await db.execute(sql`
      ALTER TABLE capital_calls 
      ADD COLUMN IF NOT EXISTS amount_type TEXT DEFAULT 'percentage'
    `);
    console.log('Added amount_type column to capital_calls table successfully');
  } catch (error) {
    console.error('Error adding amount_type to capital_calls:', error);
  }
  
  try {
    // Add amount_type column to closing_schedule_events if it doesn't exist
    await db.execute(sql`
      ALTER TABLE closing_schedule_events 
      ADD COLUMN IF NOT EXISTS amount_type TEXT DEFAULT 'percentage'
    `);
    console.log('Added amount_type column to closing_schedule_events table successfully');
  } catch (error) {
    console.error('Error adding amount_type to closing_schedule_events:', error);
  }

  console.log('Migration completed');
  process.exit(0);
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
