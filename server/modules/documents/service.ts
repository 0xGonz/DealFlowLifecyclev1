import { db } from '../../db';
import { documents } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { pool } from '../../db';

/**
 * Unified Document Service
 * Single source of truth for all document operations
 * Uses Drizzle ORM with fallback to raw SQL for compatibility
 */
export class DocumentService {
  
  /**
   * Get all documents for a specific deal
   */
  static async getDocumentsByDeal(dealId: number) {
    try {
      console.log(`🔍 DocumentService: Fetching documents for deal ${dealId}`);
      
      // Use raw SQL for production compatibility with proper column mapping
      const query = `
        SELECT 
          id,
          deal_id as "dealId",
          file_name as "fileName", 
          file_type as "fileType",
          file_size as "fileSize",
          file_path as "filePath",
          uploaded_by as "uploadedBy",
          uploaded_at as "uploadedAt",
          description,
          document_type as "documentType"
        FROM documents 
        WHERE deal_id = $1
        ORDER BY uploaded_at DESC
      `;
      
      const result = await pool.query(query, [dealId]);
      
      console.log(`✅ DocumentService: Found ${result.rows.length} documents for deal ${dealId}`);
      return result.rows;
      
    } catch (error) {
      const err = error as Error;
      console.error(`💥 DocumentService: Error fetching documents for deal ${dealId}:`, err);
      throw new Error(`Failed to fetch documents: ${err.message}`);
    }
  }

  /**
   * Get a single document by ID
   */
  static async getDocumentById(documentId: number) {
    try {
      console.log(`🔍 DocumentService: Fetching document ${documentId}`);
      
      const query = `
        SELECT 
          id,
          deal_id as "dealId",
          file_name as "fileName", 
          file_type as "fileType",
          file_size as "fileSize",
          file_path as "filePath",
          uploaded_by as "uploadedBy",
          uploaded_at as "uploadedAt",
          description,
          document_type as "documentType"
        FROM documents 
        WHERE id = $1
      `;
      
      const result = await pool.query(query, [documentId]);
      
      if (result.rows.length === 0) {
        console.log(`⚠️ DocumentService: Document ${documentId} not found`);
        return null;
      }
      
      const document = result.rows[0];
      console.log(`✅ DocumentService: Found document ${documentId}: ${document.fileName}`);
      
      return {
        ...document,
        downloadUrl: `/api/documents/${document.id}/download`
      };
      
    } catch (error) {
      const err = error as Error;
      console.error(`💥 DocumentService: Error fetching document ${documentId}:`, err);
      throw new Error(`Failed to fetch document: ${err.message}`);
    }
  }

  /**
   * Create a new document
   */
  static async createDocument(documentData: any) {
    try {
      console.log(`📝 DocumentService: Creating new document: ${documentData.fileName}`);
      
      // Use Drizzle ORM for creation (handles schema compatibility automatically)
      const [newDocument] = await db
        .insert(documents)
        .values({
          dealId: documentData.dealId,
          fileName: documentData.fileName,
          fileType: documentData.fileType,
          fileSize: documentData.fileSize,
          filePath: documentData.filePath,
          uploadedBy: documentData.uploadedBy,
          description: documentData.description || null,
          documentType: documentData.documentType || 'general'
        })
        .returning();
      
      console.log(`✅ DocumentService: Created document with ID ${newDocument.id}`);
      return newDocument;
      
    } catch (error) {
      const err = error as Error;
      console.error(`💥 DocumentService: Error creating document:`, err);
      throw new Error(`Failed to create document: ${err.message}`);
    }
  }

  /**
   * Update document metadata
   */
  static async updateDocument(documentId: number, updates: { description?: string; documentType?: string }) {
    try {
      console.log(`📝 DocumentService: Updating document ${documentId}`, updates);
      
      // Use raw SQL for updates to avoid type compatibility issues
      const setClause = [];
      const values = [];
      let paramIndex = 2;
      
      if (updates.description !== undefined) {
        setClause.push(`description = $${paramIndex}`);
        values.push(updates.description);
        paramIndex++;
      }
      
      if (updates.documentType !== undefined) {
        setClause.push(`document_type = $${paramIndex}`);
        values.push(updates.documentType);
        paramIndex++;
      }
      
      if (setClause.length === 0) {
        throw new Error('No updates provided');
      }
      
      const query = `
        UPDATE documents 
        SET ${setClause.join(', ')}
        WHERE id = $1
        RETURNING id, file_name as "fileName", document_type as "documentType", description
      `;
      
      const result = await pool.query(query, [documentId, ...values]);
      
      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }
      
      console.log(`✅ DocumentService: Updated document ${documentId}`);
      return result.rows[0];
      
    } catch (error) {
      const err = error as Error;
      console.error(`💥 DocumentService: Error updating document ${documentId}:`, err);
      throw new Error(`Failed to update document: ${err.message}`);
    }
  }

  /**
   * Delete a document
   */
  static async deleteDocument(documentId: number) {
    try {
      console.log(`🗑️ DocumentService: Deleting document ${documentId}`);
      
      const result = await db
        .delete(documents)
        .where(eq(documents.id, documentId));
      
      console.log(`✅ DocumentService: Deleted document ${documentId}`);
      return true;
      
    } catch (error) {
      const err = error as Error;
      console.error(`💥 DocumentService: Error deleting document ${documentId}:`, err);
      throw new Error(`Failed to delete document: ${err.message}`);
    }
  }

  /**
   * Get documents by type for a deal
   */
  static async getDocumentsByType(dealId: number, documentType: string) {
    try {
      console.log(`🔍 DocumentService: Fetching ${documentType} documents for deal ${dealId}`);
      
      const query = `
        SELECT 
          id,
          deal_id as "dealId",
          file_name as "fileName", 
          file_type as "fileType",
          file_size as "fileSize",
          file_path as "filePath",
          uploaded_by as "uploadedBy",
          uploaded_at as "uploadedAt",
          description,
          document_type as "documentType"
        FROM documents 
        WHERE deal_id = $1 AND document_type = $2
        ORDER BY uploaded_at DESC
      `;
      
      const result = await pool.query(query, [dealId, documentType]);
      
      console.log(`✅ DocumentService: Found ${result.rows.length} ${documentType} documents`);
      return result.rows;
      
    } catch (error) {
      const err = error as Error;
      console.error(`💥 DocumentService: Error fetching ${documentType} documents:`, err);
      throw new Error(`Failed to fetch ${documentType} documents: ${err.message}`);
    }
  }
}