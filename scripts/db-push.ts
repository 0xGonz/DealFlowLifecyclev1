import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '../server/db';

async function main() {
  console.log('Pushing schema to database...');
  
  try {
    // This will create tables if they don't exist or update them if they do
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Schema pushed successfully!');
  } catch (error) {
    console.error('Error pushing schema:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
