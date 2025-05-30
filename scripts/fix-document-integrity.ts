import { Pool } from 'pg';
import { DocumentIntegrityService } from '../server/services/document-integrity.service';

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixDocumentIntegrity() {
  console.log('=== DOCUMENT INTEGRITY FIX UTILITY ===\n');
  
  const service = new DocumentIntegrityService(pool);
  
  try {
    // Initialize audit table
    await service.initializeAuditTable();
    console.log('✅ Audit table initialized\n');
    
    // Generate integrity report
    console.log('📊 Generating integrity report...\n');
    const report = await service.generateIntegrityReport();
    console.log(report);
    
    // Scan for mismatches
    const mismatches = await service.scanDocumentIntegrity();
    
    if (mismatches.length === 0) {
      console.log('🎉 No document integrity issues found!');
      return;
    }
    
    // Process each mismatch
    for (const mismatch of mismatches) {
      console.log(`\n🔧 Processing Document ID ${mismatch.id}:`);
      console.log(`   Expected: ${mismatch.expectedName}`);
      console.log(`   Confidence: ${mismatch.confidence}`);
      
      if (mismatch.suggestedFix && mismatch.confidence === 'high') {
        console.log(`   Attempting automatic fix with: ${mismatch.suggestedFix}`);
        
        const success = await service.fixDocumentContent(
          mismatch.id, 
          mismatch.suggestedFix
        );
        
        if (success) {
          console.log(`   ✅ Document ${mismatch.id} fixed successfully`);
        } else {
          console.log(`   ❌ Failed to fix document ${mismatch.id}`);
        }
      } else {
        console.log(`   ⚠️  Manual review required (confidence: ${mismatch.confidence})`);
        if (mismatch.suggestedFix) {
          console.log(`   Suggested source: ${mismatch.suggestedFix}`);
        }
      }
    }
    
    // Generate final report
    console.log('\n📋 FINAL INTEGRITY REPORT:');
    const finalReport = await service.generateIntegrityReport();
    console.log(finalReport);
    
  } catch (error) {
    console.error('❌ Error during document integrity fix:', error);
  } finally {
    await pool.end();
  }
}

// Handle specific document fix if ID provided
async function fixSpecificDocument(docId: number, sourcePath?: string) {
  const service = new DocumentIntegrityService(pool);
  
  try {
    await service.initializeAuditTable();
    
    if (sourcePath) {
      // Direct fix with provided source
      const success = await service.fixDocumentContent(docId, sourcePath);
      console.log(success ? '✅ Document fixed' : '❌ Fix failed');
    } else {
      // Find matching files and suggest fixes
      const { rows: [doc] } = await pool.query(
        'SELECT file_name, deal_id FROM documents WHERE id = $1',
        [docId]
      );
      
      if (!doc) {
        console.log('❌ Document not found');
        return;
      }
      
      console.log(`🔍 Finding matches for: ${doc.file_name}`);
      const candidates = await service.findMatchingFiles(doc.file_name);
      
      if (candidates.length > 0) {
        console.log('\n📋 Found potential matches:');
        candidates.slice(0, 5).forEach((candidate, index) => {
          console.log(`${index + 1}. ${candidate.filename}`);
          console.log(`   Path: ${candidate.path}`);
          console.log(`   Size: ${candidate.size} bytes`);
          console.log(`   Confidence: ${(candidate.matchConfidence * 100).toFixed(1)}%\n`);
        });
        
        // Auto-fix if high confidence match
        if (candidates[0].matchConfidence > 0.9) {
          console.log('🔧 Auto-fixing with highest confidence match...');
          const success = await service.fixDocumentContent(docId, candidates[0].path);
          console.log(success ? '✅ Document fixed' : '❌ Fix failed');
        }
      } else {
        console.log('❌ No matching files found');
      }
    }
    
  } finally {
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length > 0) {
  const docId = parseInt(args[0]);
  const sourcePath = args[1];
  
  if (isNaN(docId)) {
    console.log('Usage: npm run fix-docs [document_id] [optional_source_path]');
    process.exit(1);
  }
  
  fixSpecificDocument(docId, sourcePath);
} else {
  fixDocumentIntegrity();
}