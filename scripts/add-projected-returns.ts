import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('Adding projected returns and multiples columns to deals table...');
    
    // Check if columns exist
    const checkColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'deals' 
      AND (column_name = 'projected_irr' OR column_name = 'projected_multiple')
    `);
    
    const existingColumns = checkColumns.rows.map((row: any) => row.column_name);
    
    if (!existingColumns.includes('projected_irr')) {
      console.log('Adding projected_irr column...');
      await db.execute(sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS projected_irr TEXT`);
    } else {
      console.log('projected_irr column already exists, skipping...');
    }
    
    if (!existingColumns.includes('projected_multiple')) {
      console.log('Adding projected_multiple column...');
      await db.execute(sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS projected_multiple TEXT`);
    } else {
      console.log('projected_multiple column already exists, skipping...');
    }
    
    console.log('Successfully added projected returns and multiples columns!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding projected returns columns:', error);
    process.exit(1);
  }
}

main();