/**
 * This script updates the fund_allocations table to include "partial" as a valid status
 * This is necessary to properly track partially funded allocations
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { fundAllocations } from '../shared/schema';
import chalk from 'chalk';

async function main() {
  try {
    console.log(chalk.blue('Starting migration to update fund_allocations status enum...'));
    
    // Check current enum values
    const result = await db.execute(sql`
      SELECT 
        t.typname,
        e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'fund_allocations_status_enum'
      ORDER BY e.enumsortorder;
    `);
    
    const currentEnumValues = result.rows.map(row => row.enumlabel);
    console.log(chalk.yellow('Current enum values:'), currentEnumValues);
    
    // Check if 'partial' already exists in the enum
    if (currentEnumValues.includes('partial')) {
      console.log(chalk.green('The "partial" status already exists in the enum. No update needed.'));
      return;
    }
    
    // Add 'partial' to the enum
    console.log(chalk.yellow('Adding "partial" status to the enum...'));
    await db.execute(sql`
      ALTER TYPE fund_allocations_status_enum ADD VALUE 'partial';
    `);
    
    console.log(chalk.green('Successfully added "partial" status to the enum.'));
    
    // Verify the update
    const updatedResult = await db.execute(sql`
      SELECT 
        t.typname,
        e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'fund_allocations_status_enum'
      ORDER BY e.enumsortorder;
    `);
    
    const updatedEnumValues = updatedResult.rows.map(row => row.enumlabel);
    console.log(chalk.green('Updated enum values:'), updatedEnumValues);
    
  } catch (error) {
    console.error(chalk.red('Error updating fund_allocations status enum:'), error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main();