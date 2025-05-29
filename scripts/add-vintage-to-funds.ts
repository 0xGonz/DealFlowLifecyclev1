import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { neon, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function main() {
  console.log('Starting migration to add vintage field to funds table');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }
  
  // Create a SQL query to alter the table
  // This is more reliable than using drizzle kit for a simple column addition
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    // Execute the ALTER TABLE statement directly
    await sql`ALTER TABLE funds ADD COLUMN IF NOT EXISTS vintage INTEGER DEFAULT NULL`;
    console.log('Successfully added vintage column to funds table');
    
    // Optionally set default values for existing rows
    const currentYear = new Date().getFullYear();
    await sql`UPDATE funds SET vintage = ${currentYear} WHERE vintage IS NULL`;
    console.log(`Set default vintage year (${currentYear}) for existing funds`);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
main().catch(console.error);
