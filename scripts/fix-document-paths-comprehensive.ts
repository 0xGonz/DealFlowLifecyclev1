#!/usr/bin/env tsx

import { DatabaseStorage } from '../server/database-storage';
import { universalPathResolver } from '../server/services/universal-path-resolver';
import fs from 'fs';
import path from 'path';

interface MigrationResult {
  totalDocuments: number;
  fixedPaths: number;
  movedFiles: number;
  errors: string[];
  warnings: string[];
}

async function fixDocumentPaths(dryRun: boolean = false): Promise<MigrationResult> {
  const storage = new DatabaseStorage();
  const result: MigrationResult = {
    totalDocuments: 0,
    fixedPaths: 0,
    movedFiles: 0,
    errors: [],
    warnings: []
  };

  console.log(`🔧 Starting comprehensive document path migration${dryRun ? ' (DRY RUN)' : ''}`);

  try {
    // Get all documents from database
    const documents = await storage.getAllDocuments();
    result.totalDocuments = documents.length;
    
    console.log(`📊 Found ${documents.length} documents in database`);

    for (const doc of documents) {
      console.log(`\n📄 Processing document ${doc.id}: ${doc.fileName}`);
      
      // Use universal path resolver to find the file
      const resolution = universalPathResolver.resolveFilePath(doc.filePath, doc.fileName);
      
      if (!resolution.found) {
        result.warnings.push(`Document ${doc.id} (${doc.fileName}): File not found in any location`);
        console.log(`⚠️  File not found: ${doc.fileName}`);
        continue;
      }

      console.log(`✅ Found file at: ${resolution.path}`);

      // Check if file needs to be moved to standardized location
      const standardizedPath = universalPathResolver.getStandardizedPath(doc.fileName, doc.dealId);
      const expectedFullPath = path.join(process.cwd(), standardizedPath);

      if (resolution.path !== expectedFullPath) {
        console.log(`📁 File needs to be moved to standardized location`);
        console.log(`   From: ${resolution.path}`);
        console.log(`   To: ${expectedFullPath}`);

        if (!dryRun) {
          // Move file to standardized location
          const moveResult = universalPathResolver.moveToStandardLocation(
            resolution.path, 
            doc.fileName, 
            doc.dealId
          );

          if (moveResult.success) {
            result.movedFiles++;
            console.log(`✅ File moved successfully`);
          } else {
            result.errors.push(`Failed to move file for document ${doc.id}: ${moveResult.error}`);
            console.log(`❌ Failed to move file: ${moveResult.error}`);
            continue;
          }
        }
      }

      // Update database path if needed
      if (doc.filePath !== standardizedPath) {
        console.log(`💾 Updating database path`);
        console.log(`   From: ${doc.filePath}`);
        console.log(`   To: ${standardizedPath}`);

        if (!dryRun) {
          try {
            await storage.updateDocument(doc.id, { filePath: standardizedPath });
            result.fixedPaths++;
            console.log(`✅ Database path updated`);
          } catch (error) {
            result.errors.push(`Failed to update database for document ${doc.id}: ${String(error)}`);
            console.log(`❌ Failed to update database: ${error}`);
          }
        }
      } else {
        console.log(`ℹ️  Database path already correct`);
      }
    }

  } catch (error) {
    result.errors.push(`Migration failed: ${String(error)}`);
    console.error('💥 Migration error:', error);
  }

  // Print summary
  console.log(`\n📋 MIGRATION SUMMARY ${dryRun ? '(DRY RUN)' : ''}`);
  console.log(`   Total documents: ${result.totalDocuments}`);
  console.log(`   Database paths fixed: ${result.fixedPaths}`);
  console.log(`   Files moved: ${result.movedFiles}`);
  console.log(`   Errors: ${result.errors.length}`);
  console.log(`   Warnings: ${result.warnings.length}`);

  if (result.errors.length > 0) {
    console.log(`\n❌ ERRORS:`);
    result.errors.forEach(error => console.log(`   - ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS:`);
    result.warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  return result;
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const backup = args.includes('--backup');

  if (backup && !dryRun) {
    console.log('🔄 Creating backup before migration...');
    // In a real implementation, you'd backup the database here
    console.log('💾 Backup created (placeholder)');
  }

  const result = await fixDocumentPaths(dryRun);
  
  if (result.errors.length === 0) {
    console.log(`\n🎉 Migration completed successfully!`);
    process.exit(0);
  } else {
    console.log(`\n💥 Migration completed with errors.`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { fixDocumentPaths };