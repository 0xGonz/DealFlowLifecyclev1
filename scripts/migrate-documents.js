#!/usr/bin/env node

/**
 * Document Migration Script
 * Migrates existing filesystem-based documents to database storage
 */

import { db } from '../server/db-read-replica.js';
import { documents } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function migrateDocuments() {
  console.log('🔄 Starting document migration from filesystem to database...');
  
  try {
    // Get all documents that have no file data but have file paths
    const documentsToMigrate = await db
      .select()
      .from(documents)
      .where(eq(documents.fileData, null));
    
    console.log(`📋 Found ${documentsToMigrate.length} documents to migrate`);
    
    let migrated = 0;
    let errors = 0;
    
    for (const doc of documentsToMigrate) {
      try {
        console.log(`\n📄 Processing: ${doc.fileName} (ID: ${doc.id})`);
        
        if (!doc.filePath) {
          console.log(`⚠️  No file path for document ${doc.id}, skipping`);
          continue;
        }
        
        // Resolve the file path
        const fullPath = path.resolve(doc.filePath);
        console.log(`📂 Looking for file at: ${fullPath}`);
        
        // Check if file exists
        if (!fs.existsSync(fullPath)) {
          console.log(`❌ File not found: ${fullPath}`);
          errors++;
          continue;
        }
        
        // Read the file
        const fileBuffer = fs.readFileSync(fullPath);
        console.log(`📖 Read file: ${fileBuffer.length} bytes`);
        
        // Convert to base64 for database storage
        const fileDataBase64 = fileBuffer.toString('base64');
        
        // Update the document record with file data
        await db
          .update(documents)
          .set({
            fileData: fileDataBase64
          })
          .where(eq(documents.id, doc.id));
        
        console.log(`✅ Migrated document ${doc.id}: ${doc.fileName}`);
        migrated++;
        
      } catch (docError) {
        console.error(`❌ Error migrating document ${doc.id}:`, docError);
        errors++;
      }
    }
    
    console.log(`\n🎉 Migration complete!`);
    console.log(`   ✅ Successfully migrated: ${migrated} documents`);
    console.log(`   ❌ Errors: ${errors} documents`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateDocuments()
    .then(() => {
      console.log('🏁 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateDocuments };