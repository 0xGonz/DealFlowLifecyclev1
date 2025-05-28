import { db } from '../db';

/**
 * Fixed Document Service - Production Compatible
 * Uses direct database queries that work with production schema
 */
export class DocumentService {
  
  /**
   * Get all documents for a deal with production compatibility
   */
  static async getDocumentsByDeal(dealId: number) {
    try {
      console.log(`🔍 DocumentService: Fetching documents for deal ${dealId}`);
      
      // Use connection query method directly
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
      `;
      
      const result = await (db as any).query(query, [dealId]);
      
      console.log(`✅ DocumentService: Found ${result.rows.length} documents for deal ${dealId}`);
      return result.rows;
      
    } catch (error) {
      const err = error as Error;
      console.error(`💥 DocumentService: Error fetching documents for deal ${dealId}:`, err);
      throw new Error(`Failed to fetch documents: ${err.message}`);
    }
  }

  /**
   * Get documents by type for a deal
   */
  static async getDocumentsByType(dealId: number, documentType: string) {
    try {
      console.log(`🔍 DocumentService: Fetching ${documentType} documents for deal ${dealId}`);
      
      const result = await db
        .select()
        .from(documents)
        .where(eq(documents.dealId, dealId));
      
      // Filter by type in JavaScript to avoid SQL compatibility issues
      const filteredResults = result.filter(doc => doc.documentType === documentType);
      
      console.log(`✅ DocumentService: Found ${filteredResults.length} ${documentType} documents`);
      return filteredResults;
      
    } catch (error) {
      const err = error as Error;
      console.error(`💥 DocumentService: Error fetching ${documentType} documents:`, err);
      throw new Error(`Failed to fetch ${documentType} documents: ${err.message}`);
    }
  }

  /**
   * Get a single document by ID
   */
  static async getDocumentById(documentId: number) {
    try {
      console.log(`🔍 DocumentService: Fetching document ${documentId}`);
      
      const result = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId));
      
      if (result.length === 0) {
        console.log(`⚠️ DocumentService: Document ${documentId} not found`);
        return null;
      }
      
      console.log(`✅ DocumentService: Found document ${documentId}`);
      return result[0];
      
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
      console.log(`🔍 DocumentService: Creating new document for deal ${documentData.dealId}`);
      
      const result = await db
        .insert(documents)
        .values(documentData)
        .returning();
      
      console.log(`✅ DocumentService: Created document ${result[0].id}`);
      return result[0];
      
    } catch (error) {
      const err = error as Error;
      console.error(`💥 DocumentService: Error creating document:`, err);
      throw new Error(`Failed to create document: ${err.message}`);
    }
  }

  /**
   * Update a document
   */
  static async updateDocument(documentId: number, updateData: any) {
    try {
      console.log(`🔍 DocumentService: Updating document ${documentId}`);
      
      const result = await db
        .update(documents)
        .set(updateData)
        .where(eq(documents.id, documentId))
        .returning();
      
      if (result.length === 0) {
        console.log(`⚠️ DocumentService: Document ${documentId} not found for update`);
        return null;
      }
      
      console.log(`✅ DocumentService: Updated document ${documentId}`);
      return result[0];
      
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
      console.log(`🔍 DocumentService: Deleting document ${documentId}`);
      
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
}