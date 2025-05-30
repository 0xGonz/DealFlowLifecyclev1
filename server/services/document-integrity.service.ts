import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

interface DocumentMismatch {
  id: number;
  expectedName: string;
  actualContentSource?: string;
  dealId: number;
  confidence: 'high' | 'medium' | 'low';
  suggestedFix?: string;
}

interface FileMatchCandidate {
  path: string;
  filename: string;
  size: number;
  matchConfidence: number;
}

export class DocumentIntegrityService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // 1. Scan and identify all document content mismatches
  async scanDocumentIntegrity(): Promise<DocumentMismatch[]> {
    console.log('🔍 Starting document integrity scan...');
    
    const { rows: documents } = await this.pool.query(`
      SELECT d.id, d.file_name, d.deal_id, length(d.file_data) as data_size_bytes,
             deals.name as deal_name
      FROM documents d
      LEFT JOIN deals ON d.deal_id = deals.id
      WHERE d.file_data IS NOT NULL
      ORDER BY d.id
    `);

    const mismatches: DocumentMismatch[] = [];
    
    for (const doc of documents) {
      console.log(`Analyzing document ${doc.id}: ${doc.file_name}`);
      
      // Check if filename suggests what content should be
      const expectedContent = this.inferExpectedContent(doc.file_name, doc.deal_name);
      
      // Find potential source files that match
      const candidates = await this.findMatchingFiles(doc.file_name, doc.deal_name);
      
      if (candidates.length > 0) {
        const bestMatch = candidates[0];
        
        // Check if current stored size matches any candidate
        const sizeMatch = candidates.find(c => Math.abs(c.size - doc.data_size_bytes) < 100);
        
        if (!sizeMatch || bestMatch.matchConfidence < 0.8) {
          mismatches.push({
            id: doc.id,
            expectedName: doc.file_name,
            actualContentSource: sizeMatch ? 'size_mismatch_detected' : 'unknown_content',
            dealId: doc.deal_id,
            confidence: bestMatch.matchConfidence > 0.9 ? 'high' : 
                       bestMatch.matchConfidence > 0.7 ? 'medium' : 'low',
            suggestedFix: bestMatch.path
          });
        }
      }
    }

    console.log(`Found ${mismatches.length} potential document mismatches`);
    return mismatches;
  }

  // 2. Find matching files in filesystem using multiple strategies
  async findMatchingFiles(targetFilename: string, dealName?: string): Promise<FileMatchCandidate[]> {
    const candidates: FileMatchCandidate[] = [];
    const searchPaths = ['uploads', 'uploads/deal-102', 'data'];

    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        const files = await this.recursiveFileSearch(searchPath, '.pdf');
        
        for (const filePath of files) {
          const filename = path.basename(filePath);
          const stats = fs.statSync(filePath);
          
          const confidence = this.calculateMatchConfidence(
            targetFilename, 
            filename, 
            dealName
          );
          
          if (confidence > 0.3) { // Only include reasonable matches
            candidates.push({
              path: filePath,
              filename,
              size: stats.size,
              matchConfidence: confidence
            });
          }
        }
      }
    }

    // Sort by confidence (highest first)
    return candidates.sort((a, b) => b.matchConfidence - a.matchConfidence);
  }

  // 3. Calculate match confidence using multiple factors
  private calculateMatchConfidence(targetName: string, candidateName: string, dealName?: string): number {
    let confidence = 0;

    // Normalize names for comparison
    const normalizeStr = (str: string) => 
      str.toLowerCase()
         .replace(/[^a-z0-9]/g, '')
         .replace(/\s+/g, '');

    const normalizedTarget = normalizeStr(targetName);
    const normalizedCandidate = normalizeStr(candidateName);

    // Exact match
    if (normalizedTarget === normalizedCandidate) {
      return 1.0;
    }

    // Substring matches
    if (normalizedCandidate.includes(normalizedTarget)) {
      confidence += 0.8;
    } else if (normalizedTarget.includes(normalizedCandidate)) {
      confidence += 0.7;
    }

    // Key terms matching
    const targetWords = normalizedTarget.split(/(?=[A-Z])|[-_\s]+/);
    const candidateWords = normalizedCandidate.split(/(?=[A-Z])|[-_\s]+/);
    
    const commonWords = targetWords.filter(word => 
      candidateWords.some(cw => cw.includes(word) || word.includes(cw))
    );
    
    confidence += (commonWords.length / Math.max(targetWords.length, 1)) * 0.5;

    // Deal name correlation
    if (dealName) {
      const dealWords = normalizeStr(dealName).split(/(?=[A-Z])|[-_\s]+/);
      const dealMatches = dealWords.filter(word => 
        normalizedCandidate.includes(word) || normalizedTarget.includes(word)
      );
      confidence += (dealMatches.length / Math.max(dealWords.length, 1)) * 0.3;
    }

    return Math.min(confidence, 1.0);
  }

  // 4. Recursive file search helper
  private async recursiveFileSearch(dir: string, extension: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.recursiveFileSearch(fullPath, extension);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.log(`Could not read directory ${dir}:`, error.message);
    }
    
    return files;
  }

  // 5. Infer expected content from filename and context
  private inferExpectedContent(filename: string, dealName?: string): string {
    const normalized = filename.toLowerCase();
    
    if (normalized.includes('offering') && normalized.includes('memorandum')) {
      return 'offering_memorandum';
    }
    if (normalized.includes('financial') && normalized.includes('statement')) {
      return 'financial_statements';
    }
    if (normalized.includes('term') && normalized.includes('sheet')) {
      return 'term_sheet';
    }
    
    return 'unknown';
  }

  // 6. Fix document with validation
  async fixDocumentContent(documentId: number, sourcePath: string): Promise<boolean> {
    console.log(`🔧 Fixing document ${documentId} with source: ${sourcePath}`);
    
    try {
      // Validate source file exists and is readable
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source file not found: ${sourcePath}`);
      }

      const stats = fs.statSync(sourcePath);
      if (stats.size < 1000) { // PDF files should be at least 1KB
        throw new Error(`Source file too small: ${stats.size} bytes`);
      }

      // Read and validate PDF header
      const fileBuffer = fs.readFileSync(sourcePath);
      if (!fileBuffer.subarray(0, 4).equals(Buffer.from('%PDF'))) {
        throw new Error('Source file is not a valid PDF');
      }

      // Begin transaction for safe update
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Get current document info for audit
        const { rows: [currentDoc] } = await client.query(
          'SELECT file_name, length(file_data) as old_size FROM documents WHERE id = $1',
          [documentId]
        );

        // Update document content
        await client.query(
          'UPDATE documents SET file_data = $1, uploaded_at = CURRENT_TIMESTAMP WHERE id = $2',
          [fileBuffer, documentId]
        );

        // Log the fix in an audit trail
        await client.query(`
          INSERT INTO document_fixes (document_id, old_size, new_size, source_path, fixed_at)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
          ON CONFLICT DO NOTHING
        `, [documentId, currentDoc?.old_size || 0, fileBuffer.length, sourcePath]);

        await client.query('COMMIT');
        
        console.log(`✅ Document ${documentId} fixed successfully`);
        console.log(`   Old size: ${currentDoc?.old_size || 0} bytes`);
        console.log(`   New size: ${fileBuffer.length} bytes`);
        console.log(`   Source: ${sourcePath}`);
        
        return true;
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error(`❌ Failed to fix document ${documentId}:`, error.message);
      return false;
    }
  }

  // 7. Create audit table for tracking fixes
  async initializeAuditTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS document_fixes (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL,
        old_size INTEGER,
        new_size INTEGER,
        source_path TEXT,
        fixed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // 8. Generate integrity report
  async generateIntegrityReport(): Promise<string> {
    const mismatches = await this.scanDocumentIntegrity();
    
    let report = '=== DOCUMENT INTEGRITY REPORT ===\n\n';
    
    if (mismatches.length === 0) {
      report += '✅ All documents appear to have correct content.\n';
      return report;
    }

    for (const mismatch of mismatches) {
      report += `Document ID: ${mismatch.id}\n`;
      report += `Expected: ${mismatch.expectedName}\n`;
      report += `Deal ID: ${mismatch.dealId}\n`;
      report += `Confidence: ${mismatch.confidence}\n`;
      if (mismatch.suggestedFix) {
        report += `Suggested Fix: ${mismatch.suggestedFix}\n`;
      }
      report += `Status: ${mismatch.actualContentSource}\n`;
      report += '---\n';
    }

    return report;
  }
}