import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Schema Compatibility Layer
 * Handles database schema differences between environments
 * Ensures backward compatibility for production deployments
 */

export interface DatabaseSchema {
  version: string;
  hasMetadataColumn: boolean;
  supportedFeatures: string[];
}

class SchemaCompatibilityManager {
  private schemaInfo: DatabaseSchema | null = null;
  
  /**
   * Detect the current database schema version and capabilities
   */
  async detectSchema(): Promise<DatabaseSchema> {
    if (this.schemaInfo) {
      return this.schemaInfo;
    }

    try {
      // Check if metadata column exists in documents table
      const result = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'metadata'
      `);
      
      const hasMetadataColumn = result.rows.length > 0;
      
      this.schemaInfo = {
        version: hasMetadataColumn ? '2.0' : '1.0',
        hasMetadataColumn,
        supportedFeatures: [
          'basic_documents',
          ...(hasMetadataColumn ? ['document_metadata', 'advanced_search'] : [])
        ]
      };

      console.log(`📊 Schema detected: v${this.schemaInfo.version}`, this.schemaInfo);
      return this.schemaInfo;
      
    } catch (error) {
      console.warn('⚠️ Schema detection failed, using safe defaults:', error);
      
      // Safe fallback for any database connection issues
      this.schemaInfo = {
        version: '1.0',
        hasMetadataColumn: false,
        supportedFeatures: ['basic_documents']
      };
      
      return this.schemaInfo;
    }
  }

  /**
   * Get document fields compatible with current schema
   */
  async getDocumentFields() {
    const schema = await this.detectSchema();
    
    const baseFields = {
      id: true,
      dealId: true,
      fileName: true,
      fileType: true,
      fileSize: true,
      filePath: true,
      uploadedBy: true,
      uploadedAt: true,
      description: true,
      documentType: true
    };

    if (schema.hasMetadataColumn) {
      return {
        ...baseFields,
        metadata: true
      };
    }

    return baseFields;
  }

  /**
   * Check if a feature is supported in current schema
   */
  async isFeatureSupported(feature: string): Promise<boolean> {
    const schema = await this.detectSchema();
    return schema.supportedFeatures.includes(feature);
  }

  /**
   * Reset schema cache (for testing or manual refresh)
   */
  resetCache() {
    this.schemaInfo = null;
  }
}

// Export singleton instance
export const schemaManager = new SchemaCompatibilityManager();

/**
 * Schema-aware query builder for documents
 */
export class DocumentQueryBuilder {
  async buildSelectQuery() {
    const fields = await schemaManager.getDocumentFields();
    
    // Build select object based on available fields
    const selectObject: Record<string, any> = {};
    
    Object.keys(fields).forEach(field => {
      selectObject[field] = sql.identifier('documents', field);
    });

    return selectObject;
  }

  async buildInsertData(data: any) {
    const schema = await schemaManager.detectSchema();
    
    if (!schema.hasMetadataColumn && data.metadata) {
      // Remove metadata field for older schemas
      const { metadata, ...compatibleData } = data;
      console.log('📝 Removing metadata field for schema compatibility');
      return compatibleData;
    }

    return data;
  }
}

export const documentQueryBuilder = new DocumentQueryBuilder();