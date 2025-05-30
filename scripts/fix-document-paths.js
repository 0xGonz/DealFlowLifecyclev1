/**
 * Document Path Migration Script
 * Fixes existing document file path issues and ensures consistency
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

async function fixDocumentPaths() {
  console.log('🔧 Starting document path migration...');
  
  try {
    // Get all documents from database
    const { rows: documents } = await pool.query('SELECT * FROM documents ORDER BY id');
    console.log(`📄 Found ${documents.length} documents to process`);
    
    let fixedCount = 0;
    let notFoundCount = 0;
    
    for (const doc of documents) {
      console.log(`\n📋 Processing document ${doc.id}: ${doc.file_name}`);
      console.log(`   Current path: ${doc.file_path}`);
      
      // Try to resolve the actual file location
      const possiblePaths = [
        // Current stored path
        doc.file_path ? path.join(process.cwd(), doc.file_path.startsWith('/') ? doc.file_path.substring(1) : doc.file_path) : null,
        // Standard upload directory with filename
        doc.file_name ? path.join(UPLOAD_DIR, doc.file_name) : null,
        // Extract filename from path and check uploads
        doc.file_path ? path.join(UPLOAD_DIR, path.basename(doc.file_path)) : null,
        // Check deal-specific subdirectories
        doc.file_path ? path.join(UPLOAD_DIR, `deal-${doc.deal_id}`, path.basename(doc.file_path)) : null
      ].filter(Boolean);
      
      let foundPath = null;
      
      for (const testPath of possiblePaths) {
        try {
          if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
            foundPath = testPath;
            console.log(`   ✅ Found file at: ${testPath}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (foundPath) {
        // Calculate the correct relative path for database storage
        const relativePath = path.relative(process.cwd(), foundPath);
        const normalizedPath = relativePath.replace(/\\/g, '/'); // Normalize for cross-platform
        
        if (normalizedPath !== doc.file_path) {
          console.log(`   🔄 Updating path from "${doc.file_path}" to "${normalizedPath}"`);
          
          await pool.query(
            'UPDATE documents SET file_path = $1 WHERE id = $2',
            [normalizedPath, doc.id]
          );
          
          fixedCount++;
        } else {
          console.log(`   ✅ Path is already correct`);
        }
      } else {
        console.log(`   ❌ File not found in any location`);
        console.log(`   Searched paths:`, possiblePaths);
        notFoundCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Total documents: ${documents.length}`);
    console.log(`   Paths fixed: ${fixedCount}`);
    console.log(`   Files not found: ${notFoundCount}`);
    console.log(`   Already correct: ${documents.length - fixedCount - notFoundCount}`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  fixDocumentPaths()
    .then(() => {
      console.log('✅ Document path migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { fixDocumentPaths };