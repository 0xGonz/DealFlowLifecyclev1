import { db } from '../../db';
import { documents } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';

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
      
      const result = await db
        .select()
        .from(documents)
        .where(eq(documents.dealId, dealId))
        .orderBy(documents.uploadedAt);
      
      console.log(`✅ DocumentService: Found ${result.length} documents for deal ${dealId}`);
      return result;
      
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
      
      const result = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);
      
      if (result.length === 0) {
        console.log(`⚠️ DocumentService: Document ${documentId} not found`);
        return null;
      }
      
      const document = result[0];
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
      
      const updateData: any = {};
      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }
      if (updates.documentType !== undefined) {
        updateData.documentType = updates.documentType;
      }
      
      if (Object.keys(updateData).length === 0) {
        throw new Error('No updates provided');
      }
      
      const result = await db
        .update(documents)
        .set(updateData)
        .where(eq(documents.id, documentId))
        .returning({
          id: documents.id,
          fileName: documents.fileName,
          documentType: documents.documentType,
          description: documents.description
        });
      
      if (result.length === 0) {
        throw new Error('Document not found');
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
      
      const result = await db
        .select()
        .from(documents)
        .where(and(
          eq(documents.dealId, dealId),
          eq(documents.documentType, documentType)
        ))
        .orderBy(documents.uploadedAt);
      
      console.log(`✅ DocumentService: Found ${result.length} ${documentType} documents`);
      return result;
      
    } catch (error) {
      const err = error as Error;
      console.error(`💥 DocumentService: Error fetching ${documentType} documents:`, err);
      throw new Error(`Failed to fetch ${documentType} documents: ${err.message}`);
    }
  }
}