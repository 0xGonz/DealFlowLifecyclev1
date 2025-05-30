/**
 * Migration script to move existing documents from filesystem to database storage
 * This ensures PDF persistence on Replit's ephemeral filesystem
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { documents } from '../shared/schema.js';
import { eq, isNull } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection using Neon (same as the app)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(connectionString);
const db = drizzle(sql);

async function migrateDocumentsToDatabase() {
  console.log('🚀 Starting document migration to database storage...');
  
  try {
    // Get all documents that have file_path but no file_data
    const documentsToMigrate = await db
      .select()
      .from(documents)
      .where(isNull(documents.fileData));

    console.log(`📋 Found ${documentsToMigrate.length} documents to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const doc of documentsToMigrate) {
      if (!doc.filePath) {
        console.log(`⚠️  Document ${doc.id} has no file path, skipping`);
        continue;
      }

      const fullPath = path.resolve(doc.filePath);
      console.log(`📂 Processing: ${doc.fileName} (ID: ${doc.id})`);
      console.log(`   Path: ${fullPath}`);

      try {
        // Check if file exists
        if (!fs.existsSync(fullPath)) {
          console.log(`❌ File not found: ${fullPath}`);
          errorCount++;
          continue;
        }

        // Read file data
        const fileData = fs.readFileSync(fullPath);
        console.log(`   Size: ${fileData.length} bytes`);

        // Convert to base64
        const base64Data = fileData.toString('base64');
        console.log(`   Base64 size: ${base64Data.length} characters`);

        // Update database with file data
        await db
          .update(documents)
          .set({
            fileData: base64Data,
            fileDataStatus: 'stored'
          })
          .where(eq(documents.id, doc.id));

        console.log(`✅ Successfully migrated: ${doc.fileName}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error migrating ${doc.fileName}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total processed: ${successCount + errorCount}`);

    if (successCount > 0) {
      console.log('\n🎉 Migration completed! Documents are now stored in database for persistence.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run migration
migrateDocumentsToDatabase();