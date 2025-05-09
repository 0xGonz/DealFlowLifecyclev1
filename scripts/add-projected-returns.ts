import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * This script adds the projected_irr and projected_multiple columns to the deals table
 * if they don't already exist.
 */
async function main() {
  console.log('Adding projected return columns to deals table...');

  try {
    // Check if the columns already exist
    const columns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'deals' AND (column_name = 'projected_irr' OR column_name = 'projected_multiple')
    `);

    const existingColumns = columns.rows.map((row: any) => row.column_name);
    console.log('Existing columns:', existingColumns);

    // Add projected_irr column if it doesn't exist
    if (!existingColumns.includes('projected_irr')) {
      console.log('Adding projected_irr column...');
      await db.execute(sql`ALTER TABLE deals ADD COLUMN projected_irr TEXT`);
      console.log('Added projected_irr column successfully');
    } else {
      console.log('projected_irr column already exists');
    }

    // Add projected_multiple column if it doesn't exist
    if (!existingColumns.includes('projected_multiple')) {
      console.log('Adding projected_multiple column...');
      await db.execute(sql`ALTER TABLE deals ADD COLUMN projected_multiple TEXT`);
      console.log('Added projected_multiple column successfully');
    } else {
      console.log('projected_multiple column already exists');
    }

    console.log('Finished adding columns');
    process.exit(0);
  } catch (error) {
    console.error('Error adding columns:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error running script:', error);
  process.exit(1);
});