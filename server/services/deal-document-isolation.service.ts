import { Pool } from 'pg';

interface DealDocumentRule {
  dealId: number;
  allowedDocumentTypes?: string[];
  maxDocuments?: number;
  validationRules?: {
    fileNamePattern?: RegExp;
    maxFileSize?: number;
    requiredFields?: string[];
  };
}

export class DealDocumentIsolationService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // 1. Validate document belongs to correct deal
  async validateDocumentDealAssociation(documentId: number, expectedDealId: number): Promise<boolean> {
    const { rows } = await this.pool.query(
      'SELECT deal_id FROM documents WHERE id = $1',
      [documentId]
    );
    
    if (rows.length === 0) {
      throw new Error(`Document ${documentId} not found`);
    }
    
    return rows[0].deal_id === expectedDealId;
  }

  // 2. Enforce deal document boundaries during operations
  async enforceDocumentIsolation(documentId: number, requestedDealId: number): Promise<void> {
    const isValid = await this.validateDocumentDealAssociation(documentId, requestedDealId);
    
    if (!isValid) {
      const { rows } = await this.pool.query(
        `SELECT d.deal_id, deals.name as deal_name 
         FROM documents d 
         LEFT JOIN deals ON d.deal_id = deals.id 
         WHERE d.id = $1`,
        [documentId]
      );
      
      throw new Error(
        `Document ${documentId} belongs to deal ${rows[0].deal_id} (${rows[0].deal_name}), ` +
        `not deal ${requestedDealId}. Cross-deal document access denied.`
      );
    }
  }

  // 3. Get documents for specific deal only
  async getDocumentsForDeal(dealId: number): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT d.id, d.file_name, d.file_type, d.uploaded_at, d.deal_id,
              length(d.file_data) as file_size
       FROM documents d
       WHERE d.deal_id = $1
       ORDER BY d.uploaded_at DESC`,
      [dealId]
    );
    
    return rows;
  }

  // 4. Upload document to specific deal with validation
  async uploadDocumentToDeal(
    dealId: number, 
    fileName: string, 
    fileData: Buffer, 
    fileType: string,
    userId?: number
  ): Promise<number> {
    // Verify deal exists
    const { rows: dealRows } = await this.pool.query(
      'SELECT id, name FROM deals WHERE id = $1',
      [dealId]
    );
    
    if (dealRows.length === 0) {
      throw new Error(`Deal ${dealId} not found`);
    }

    // Validate file
    this.validateFileForDeal(fileName, fileData, dealId);

    // Insert document with deal association
    const { rows } = await this.pool.query(
      `INSERT INTO documents (deal_id, file_name, file_type, file_data, uploaded_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING id`,
      [dealId, fileName, fileType, fileData]
    );

    console.log(`Document uploaded: ${fileName} → Deal ${dealId} (${dealRows[0].name})`);
    return rows[0].id;
  }

  // 5. Move document between deals (with validation)
  async moveDocumentToDeal(documentId: number, newDealId: number, reason: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current document info
      const { rows: docRows } = await client.query(
        `SELECT d.id, d.file_name, d.deal_id, deals.name as current_deal_name
         FROM documents d
         LEFT JOIN deals ON d.deal_id = deals.id
         WHERE d.id = $1`,
        [documentId]
      );
      
      if (docRows.length === 0) {
        throw new Error(`Document ${documentId} not found`);
      }

      // Get new deal info
      const { rows: newDealRows } = await client.query(
        'SELECT id, name FROM deals WHERE id = $1',
        [newDealId]
      );
      
      if (newDealRows.length === 0) {
        throw new Error(`Target deal ${newDealId} not found`);
      }

      const doc = docRows[0];
      const newDeal = newDealRows[0];

      // Update deal association
      await client.query(
        'UPDATE documents SET deal_id = $1, uploaded_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newDealId, documentId]
      );

      // Log the move for audit trail
      await client.query(
        `INSERT INTO document_moves (document_id, from_deal_id, to_deal_id, reason, moved_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT DO NOTHING`,
        [documentId, doc.deal_id, newDealId, reason]
      );

      await client.query('COMMIT');
      
      console.log(`Document moved: ${doc.file_name} from Deal ${doc.deal_id} (${doc.current_deal_name}) → Deal ${newDealId} (${newDeal.name})`);
      console.log(`Reason: ${reason}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 6. Delete document from specific deal
  async deleteDocumentFromDeal(documentId: number, dealId: number): Promise<void> {
    // Verify document belongs to deal
    await this.enforceDocumentIsolation(documentId, dealId);

    const { rows } = await this.pool.query(
      'DELETE FROM documents WHERE id = $1 AND deal_id = $2 RETURNING file_name',
      [documentId, dealId]
    );

    if (rows.length === 0) {
      throw new Error(`Document ${documentId} not found in deal ${dealId}`);
    }

    console.log(`Document deleted: ${rows[0].file_name} from Deal ${dealId}`);
  }

  // 7. Download document with deal verification
  async downloadDocumentFromDeal(documentId: number, dealId: number): Promise<{
    fileName: string;
    fileData: Buffer;
    fileType: string;
  }> {
    // Verify document belongs to deal
    await this.enforceDocumentIsolation(documentId, dealId);

    const { rows } = await this.pool.query(
      'SELECT file_name, file_data, file_type FROM documents WHERE id = $1 AND deal_id = $2',
      [documentId, dealId]
    );

    if (rows.length === 0) {
      throw new Error(`Document ${documentId} not found in deal ${dealId}`);
    }

    return {
      fileName: rows[0].file_name,
      fileData: rows[0].file_data,
      fileType: rows[0].file_type
    };
  }

  // 8. Audit deal document integrity
  async auditDealDocumentIntegrity(): Promise<{
    dealId: number;
    dealName: string;
    documentCount: number;
    issues: string[];
  }[]> {
    const { rows: deals } = await this.pool.query(`
      SELECT d.id, d.name,
             COUNT(docs.id) as document_count
      FROM deals d
      LEFT JOIN documents docs ON d.id = docs.deal_id
      GROUP BY d.id, d.name
      ORDER BY d.id
    `);

    const auditResults = [];

    for (const deal of deals) {
      const issues: string[] = [];

      // Check for orphaned documents
      const { rows: orphanedDocs } = await this.pool.query(`
        SELECT d.id, d.file_name
        FROM documents d
        WHERE d.deal_id = $1
        AND NOT EXISTS (SELECT 1 FROM deals WHERE id = d.deal_id)
      `, [deal.id]);

      if (orphanedDocs.length > 0) {
        issues.push(`${orphanedDocs.length} orphaned documents found`);
      }

      // Check for documents with mismatched content
      const { rows: suspiciousDocs } = await this.pool.query(`
        SELECT d.id, d.file_name, deals.name as deal_name
        FROM documents d
        JOIN deals ON d.deal_id = deals.id
        WHERE d.deal_id = $1
        AND (
          (d.file_name ILIKE '%valor%' AND deals.name NOT ILIKE '%valor%') OR
          (d.file_name ILIKE '%winkler%' AND deals.name NOT ILIKE '%winkler%') OR
          (d.file_name ILIKE '%s3%' AND deals.name NOT ILIKE '%s3%')
        )
      `, [deal.id]);

      if (suspiciousDocs.length > 0) {
        issues.push(`${suspiciousDocs.length} documents with mismatched content detected`);
      }

      auditResults.push({
        dealId: deal.id,
        dealName: deal.name,
        documentCount: parseInt(deal.document_count),
        issues
      });
    }

    return auditResults;
  }

  // 9. Create audit tables
  async initializeAuditTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS document_moves (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL,
        from_deal_id INTEGER,
        to_deal_id INTEGER NOT NULL,
        reason TEXT,
        moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_document_moves_document_id 
      ON document_moves(document_id)
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_document_moves_deals 
      ON document_moves(from_deal_id, to_deal_id)
    `);
  }

  // 10. Validate file for deal
  private validateFileForDeal(fileName: string, fileData: Buffer, dealId: number): void {
    // Basic file validation
    if (fileData.length === 0) {
      throw new Error('Empty file not allowed');
    }

    if (fileData.length > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('File too large (max 50MB)');
    }

    // PDF validation
    if (fileName.toLowerCase().endsWith('.pdf')) {
      if (!fileData.subarray(0, 4).equals(Buffer.from('%PDF'))) {
        throw new Error('Invalid PDF file structure');
      }
    }

    console.log(`File validation passed: ${fileName} (${fileData.length} bytes) for Deal ${dealId}`);
  }
}