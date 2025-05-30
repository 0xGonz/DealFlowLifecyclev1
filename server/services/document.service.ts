import { DatabaseStorage } from '../database-storage';
import { FileManagerService } from './file-manager.service';

/**
 * Core Document Service
 * Handles all document-related business logic with proper modular design
 */
export class DocumentService {
  private storage = new DatabaseStorage();

  /**
   * Get document by ID with file resolution
   */
  async getDocumentById(documentId: number): Promise<{
    document: any;
    resolvedPath: string | null;
    exists: boolean;
  }> {
    const document = await this.storage.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const resolvedPath = FileManagerService.resolveFilePath(document.filePath, document.fileName);
    
    return {
      document,
      resolvedPath,
      exists: resolvedPath !== null
    };
  }

  /**
   * Get all documents for a deal with file status
   */
  async getDocumentsByDeal(dealId: number): Promise<Array<{
    document: any;
    exists: boolean;
    resolvedPath: string | null;
  }>> {
    const documents = await this.storage.getDocumentsByDeal(dealId);
    
    return documents.map(document => {
      const resolvedPath = FileManagerService.resolveFilePath(document.filePath, document.fileName);
      return {
        document,
        exists: resolvedPath !== null,
        resolvedPath
      };
    });
  }

  /**
   * Create read stream for document
   */
  createDocumentStream(resolvedPath: string): NodeJS.ReadableStream | null {
    return FileManagerService.createReadStream(resolvedPath);
  }

  /**
   * Get document metadata and diagnostics
   */
  async getDocumentDiagnostics(documentId: number): Promise<{
    document: any;
    diagnostics: ReturnType<typeof FileManagerService.getDiagnosticInfo>;
  }> {
    const document = await this.storage.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const diagnostics = FileManagerService.getDiagnosticInfo(document.filePath, document.fileName);
    
    return {
      document,
      diagnostics
    };
  }

  /**
   * Delete document and associated file
   */
  async deleteDocument(documentId: number): Promise<boolean> {
    const { document, resolvedPath } = await this.getDocumentById(documentId);
    
    // Delete from database first
    const deleted = await this.storage.deleteDocument(documentId);
    
    // Then delete physical file if it exists
    if (deleted && resolvedPath) {
      FileManagerService.deleteFile(resolvedPath);
    }
    
    return deleted;
  }

  /**
   * Update document metadata
   */
  async updateDocument(documentId: number, updates: {
    description?: string;
    documentType?: string;
  }): Promise<any> {
    return await this.storage.updateDocument(documentId, updates);
  }
}