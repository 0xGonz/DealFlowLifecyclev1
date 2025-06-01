#!/usr/bin/env node

/**
 * Comprehensive Document System Audit Tool
 * 
 * This script analyzes the entire document system to identify:
 * - Documents with missing file data
 * - Documents with broken file paths
 * - Documents that need migration
 * - Overall system health metrics
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 Document System Audit Starting...\n');

// Database query to get all document metadata
const getAllDocumentsQuery = `
SELECT 
  id,
  file_name,
  file_type,
  file_size,
  file_path,
  deal_id,
  uploaded_at,
  LENGTH(file_data) as file_data_length,
  CASE 
    WHEN file_data IS NOT NULL AND LENGTH(file_data) > 0 THEN 'database'
    WHEN file_path IS NOT NULL THEN 'filesystem'
    ELSE 'missing'
  END as storage_type
FROM documents 
ORDER BY id;
`;

try {
  // Get all documents from database
  const dbResult = execSync(`psql "${process.env.DATABASE_URL}" -c "${getAllDocumentsQuery}" --csv`, {
    encoding: 'utf8'
  });
  
  const lines = dbResult.trim().split('\n');
  const headers = lines[0].split(',');
  const documents = lines.slice(1).map(line => {
    const values = line.split(',');
    const doc = {};
    headers.forEach((header, index) => {
      doc[header] = values[index] || null;
    });
    return doc;
  });

  console.log(`📊 Found ${documents.length} documents in database\n`);

  // Analyze each document
  const analysis = {
    total: documents.length,
    withDatabaseData: 0,
    withFilesystemData: 0,
    missing: 0,
    filesystemValid: 0,
    filesystemBroken: 0,
    details: []
  };

  for (const doc of documents) {
    const docAnalysis = {
      id: doc.id,
      fileName: doc.file_name,
      fileSize: parseInt(doc.file_size) || 0,
      storageType: doc.storage_type,
      hasDbData: doc.file_data_length && parseInt(doc.file_data_length) > 0,
      hasFilePath: !!doc.file_path,
      fileExists: false,
      status: 'unknown'
    };

    if (doc.storage_type === 'database') {
      analysis.withDatabaseData++;
      docAnalysis.status = 'database_ok';
    } else if (doc.storage_type === 'filesystem') {
      analysis.withFilesystemData++;
      
      // Check if file actually exists on disk
      if (doc.file_path) {
        const fullPath = path.resolve(doc.file_path);
        docAnalysis.expectedPath = fullPath;
        
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          docAnalysis.fileExists = true;
          docAnalysis.actualSize = stats.size;
          docAnalysis.status = 'filesystem_ok';
          analysis.filesystemValid++;
        } else {
          docAnalysis.status = 'filesystem_broken';
          analysis.filesystemBroken++;
        }
      } else {
        docAnalysis.status = 'no_path';
        analysis.filesystemBroken++;
      }
    } else {
      analysis.missing++;
      docAnalysis.status = 'missing';
    }

    analysis.details.push(docAnalysis);
  }

  // Print summary
  console.log('📈 DOCUMENT SYSTEM AUDIT RESULTS');
  console.log('================================');
  console.log(`Total Documents: ${analysis.total}`);
  console.log(`Database Storage: ${analysis.withDatabaseData} (${((analysis.withDatabaseData/analysis.total)*100).toFixed(1)}%)`);
  console.log(`Filesystem Storage: ${analysis.withFilesystemData} (${((analysis.withFilesystemData/analysis.total)*100).toFixed(1)}%)`);
  console.log(`  - Valid Files: ${analysis.filesystemValid}`);
  console.log(`  - Broken Files: ${analysis.filesystemBroken}`);
  console.log(`Missing Data: ${analysis.missing}`);
  console.log();

  // Print problematic documents
  const problematic = analysis.details.filter(doc => 
    doc.status === 'filesystem_broken' || doc.status === 'missing' || doc.status === 'no_path'
  );

  if (problematic.length > 0) {
    console.log('🚨 PROBLEMATIC DOCUMENTS');
    console.log('========================');
    problematic.forEach(doc => {
      console.log(`ID ${doc.id}: ${doc.fileName}`);
      console.log(`  Status: ${doc.status}`);
      console.log(`  Expected Size: ${doc.fileSize} bytes`);
      if (doc.expectedPath) {
        console.log(`  Expected Path: ${doc.expectedPath}`);
      }
      console.log();
    });
  }

  // Print recommendations
  console.log('💡 RECOMMENDATIONS');
  console.log('==================');
  
  if (analysis.filesystemBroken > 0) {
    console.log(`• ${analysis.filesystemBroken} documents have broken filesystem references`);
    console.log('  - Check if files were moved or deleted');
    console.log('  - Consider re-uploading these documents');
    console.log('  - Update file paths if files exist elsewhere');
  }
  
  if (analysis.missing > 0) {
    console.log(`• ${analysis.missing} documents have no data source`);
    console.log('  - These documents need to be re-uploaded');
  }
  
  if (analysis.withDatabaseData < analysis.total * 0.8) {
    console.log('• Consider migrating filesystem documents to database storage');
    console.log('  - Database storage is more reliable and portable');
    console.log('  - Eliminates file path dependencies');
  }

  console.log('\n✅ Audit Complete');

} catch (error) {
  console.error('❌ Audit failed:', error.message);
  process.exit(1);
}