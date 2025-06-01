import { databaseDocumentStorage } from './database-document-storage.js';
import fs from 'fs';
import path from 'path';

/**
 * Scalable Document Handler
 * 
 * Provides a unified interface for document retrieval that:
 * 1. Attempts database storage first (fastest, most reliable)
 * 2. Falls back to filesystem with proper error handling
 * 3. Provides detailed diagnostics for troubleshooting
 * 4. Supports future migration strategies
 */
export class ScalableDocumentHandler {
  
  /**
   * Retrieve document content with automatic fallback strategy
   */
  async getDocumentContent(documentId: number): Promise<{
    success: boolean;
    buffer?: Buffer;
    fileName?: string;
    mimeType?: string;
    source: 'database' | 'filesystem' | 'none';
    error?: string;
    diagnostics?: any;
  }> {
    try {
      console.log(`🔍 Retrieving document ${documentId} with scalable handler`);
      
      // Get document metadata
      const document = await databaseDocumentStorage.getDocument(documentId);
      if (!document) {
        return {
          success: false,
          source: 'none',
          error: 'Document not found in database',
          diagnostics: { documentId }
        };
      }

      const diagnostics = {
        documentId,
        fileName: document.fileName,
        fileSize: document.fileSize,
        hasDbData: !!document.fileData,
        dbDataLength: document.fileData?.length || 0,
        hasFilePath: !!document.filePath,
        filePath: document.filePath
      };

      // Strategy 1: Try database storage first
      if (document.fileData && document.fileData.length > 0) {
        try {
          const fileBuffer = Buffer.from(document.fileData, 'base64');
          
          if (fileBuffer.length > 0) {
            console.log(`✅ Document ${documentId} served from database (${fileBuffer.length} bytes)`);
            return {
              success: true,
              buffer: fileBuffer,
              fileName: document.fileName,
              mimeType: document.fileType,
              source: 'database',
              diagnostics
            };
          }
        } catch (error) {
          console.error(`❌ Database content conversion failed for document ${documentId}:`, error);
          diagnostics.dbConversionError = error.message;
        }
      }

      // Strategy 2: Try filesystem fallback
      if (document.filePath) {
        const fullPath = path.resolve(document.filePath);
        diagnostics.resolvedPath = fullPath;
        
        try {
          if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            diagnostics.fileExists = true;
            diagnostics.actualFileSize = stats.size;
            
            const fileBuffer = fs.readFileSync(fullPath);
            console.log(`✅ Document ${documentId} served from filesystem (${fileBuffer.length} bytes)`);
            
            return {
              success: true,
              buffer: fileBuffer,
              fileName: document.fileName,
              mimeType: document.fileType,
              source: 'filesystem',
              diagnostics
            };
          } else {
            diagnostics.fileExists = false;
            console.error(`❌ Filesystem file not found: ${fullPath}`);
          }
        } catch (error) {
          console.error(`❌ Filesystem read failed for document ${documentId}:`, error);
          diagnostics.filesystemError = error.message;
        }
      }

      // Strategy 3: No valid source found
      console.error(`❌ Document ${documentId} has no valid content source`);
      return {
        success: false,
        source: 'none',
        error: 'No valid content source available',
        diagnostics
      };

    } catch (error) {
      console.error(`❌ Critical error retrieving document ${documentId}:`, error);
      return {
        success: false,
        source: 'none',
        error: `Critical retrieval error: ${error.message}`,
        diagnostics: { documentId, criticalError: error.message }
      };
    }
  }

  /**
   * Stream document content for HTTP responses
   */
  async streamDocument(documentId: number, res: any): Promise<boolean> {
    const result = await this.getDocumentContent(documentId);
    
    if (!result.success) {
      console.error(`📊 Document ${documentId} retrieval failed:`, result.diagnostics);
      
      // Return detailed error for debugging
      res.status(410).json({
        error: result.error,
        documentId,
        diagnostics: result.diagnostics,
        recommendations: this.generateRecommendations(result.diagnostics)
      });
      return false;
    }

    // Set response headers for successful content delivery
    res.removeHeader('ETag');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', result.mimeType);
    
    const disposition = result.mimeType === 'application/pdf' ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(result.fileName)}"`);
    res.setHeader('Content-Length', result.buffer.length.toString());
    
    console.log(`📤 Streaming document ${documentId} from ${result.source} (${result.buffer.length} bytes)`);
    res.send(result.buffer);
    return true;
  }

  /**
   * Generate actionable recommendations based on diagnostics
   */
  private generateRecommendations(diagnostics: any): string[] {
    const recommendations = [];
    
    if (!diagnostics.hasDbData && !diagnostics.fileExists) {
      recommendations.push('Document needs to be re-uploaded - no valid data source found');
    } else if (!diagnostics.hasDbData && diagnostics.fileExists) {
      recommendations.push('Document could be migrated from filesystem to database storage');
    } else if (diagnostics.hasDbData && diagnostics.dbConversionError) {
      recommendations.push('Database content appears corrupted - consider re-uploading');
    }
    
    if (diagnostics.hasFilePath && !diagnostics.fileExists) {
      recommendations.push('Update file path or restore missing file');
    }
    
    return recommendations;
  }

  /**
   * Get system-wide document health metrics
   */
  async getSystemMetrics(): Promise<{
    total: number;
    databaseStorage: number;
    filesystemStorage: number;
    broken: number;
    healthScore: number;
  }> {
    // This would integrate with the audit tool results
    // For now, return basic metrics
    return {
      total: 17,
      databaseStorage: 1,
      filesystemStorage: 16,
      broken: 16,
      healthScore: Math.round((1 / 17) * 100) // 6% healthy
    };
  }
}

export const scalableDocumentHandler = new ScalableDocumentHandler();