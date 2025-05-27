import { db } from '../db';
import { documents } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { schemaManager, documentQueryBuilder } from '../database/schema-compatibility';

/**
 * Document Service Layer
 * Provides a clean, modular interface for document operations
 * Handles schema compatibility automatically
 */

export class DocumentService {
  
  /**
   * Get all documents for a specific deal
   * Automatically adapts to database schema version
   */
  async getDocumentsByDeal(dealId: number) {
    try {
      console.log(`🔍 DocumentService: Fetching documents for deal ${dealId}`);
      
      // Check schema compatibility
      const schema = await schemaManager.detectSchema();
      console.log(`📊 Using schema version ${schema.version} for deal ${dealId}`);
      
      if (!db) {
        throw new Error('Database not initialized');
      }
      
      // Use schema-aware query builder
      const selectFields = await documentQueryBuilder.buildSelectQuery();
      
      const result = await db
        .select(selectFields)
        .from(documents)
        .where(eq(documents.dealId, dealId));
      
      console.log(`✅ DocumentService: Found ${result.length} documents for deal ${dealId}`);
      return result;
      
    } catch (error) {
      const err = error as Error;
      console.error(`💥 DocumentService: Error fetching documents for deal ${dealId}:`, {
        message: err.message,
        code: (err as any).code,
        name: err.name
      });
      throw new Error(`Failed to fetch documents: ${err.message}`);
    }
  }

  /**
   * Get documents by type for a deal
   */
  async getDocumentsByType(dealId: number, documentType: string) {
    try {
      console.log(`🔍 DocumentService: Fetching ${documentType} documents for deal ${dealId}`);
      
      const selectFields = await documentQueryBuilder.buildSelectQuery();
      
      const result = await db
        .select(selectFields)
        .from(documents)
        .where(
          eq(documents.dealId, dealId) && eq(documents.documentType, documentType)
        );
      
      console.log(`✅ DocumentService: Found ${result.length} ${documentType} documents`);
      return result;
      
    } catch (error) {
      const err = error as Error;
      console.error(`💥 DocumentService: Error fetching ${documentType} documents:`, err);
      throw new Error(`Failed to fetch ${documentType} documents: ${err.message}`);
    }
  }

  /**
   * Get a single document by ID
   */
  async getDocumentById(id: number) {
    try {
      const selectFields = await documentQueryBuilder.buildSelectQuery();
      
      const result = await db
        .select(selectFields)
        .from(documents)
        .where(eq(documents.id, id))
        .limit(1);
      
      if (result.length === 0) {
        return null;
      }
      
      return result[0];
      
    } catch (error) {
      const err = error as Error;
      console.error(`💥 DocumentService: Error fetching document ${id}:`, err);
      throw new Error(`Failed to fetch document: ${err.message}`);
    }
  }

  /**
   * Create a new document
   * Automatically removes incompatible fields based on schema
   */
  async createDocument(documentData: any) {
    try {
      console.log(`📝 DocumentService: Creating new document: ${documentData.fileName}`);
      
      // Use schema-aware data builder to ensure compatibility
      const compatibleData = await documentQueryBuilder.buildInsertData(documentData);
      
      const [newDocument] = await db
        .insert(documents)
        .values(compatibleData)
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
   * Update document description and type
   */
  async updateDocument(id: number, updates: { description?: string; documentType?: string }) {
    try {
      console.log(`📝 DocumentService: Updating document ${id}`, updates);
      
      const [updatedDocument] = await db
        .update(documents)
        .set(updates)
        .where(eq(documents.id, id))
        .returning();
      
      if (!updatedDocument) {
        throw new Error('Document not found');
      }
      
      console.log(`✅ DocumentService: Updated document ${id}`);
      return updatedDocument;
      
    } catch (error) {
      const err = error as Error;
      console.error(`💥 DocumentService: Error updating document ${id}:`, err);
      throw new Error(`Failed to update document: ${err.message}`);
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: number) {
    try {
      console.log(`🗑️ DocumentService: Deleting document ${id}`);
      
      const result = await db
        .delete(documents)
        .where(eq(documents.id, id));
      
      console.log(`✅ DocumentService: Deleted document ${id}`);
      return !!result;
      
    } catch (error) {
      const err = error as Error;
      console.error(`💥 DocumentService: Error deleting document ${id}:`, err);
      throw new Error(`Failed to delete document: ${err.message}`);
    }
  }

  /**
   * Check if advanced features are available
   */
  async getAvailableFeatures() {
    const schema = await schemaManager.detectSchema();
    return {
      schemaVersion: schema.version,
      hasMetadata: schema.hasMetadataColumn,
      supportedFeatures: schema.supportedFeatures
    };
  }
}

// Export singleton instance
export const documentService = new DocumentService();