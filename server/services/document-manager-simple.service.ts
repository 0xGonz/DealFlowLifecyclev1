import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from '../database-storage.js';
import { documents } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DocumentManagerService {
  private readonly storageDir = path.join(process.cwd(), 'storage', 'documents');

  constructor() {
    this.ensureStorageDirectory();
  }

  private async ensureStorageDirectory() {
    try {
      await fs.access(this.storageDir);
    } catch {
      await fs.mkdir(this.storageDir, { recursive: true });
    }
  }

  /**
   * Upload and store a document
   */
  async uploadDocument(
    dealId: number,
    fileName: string,
    fileType: string,
    buffer: Buffer,
    documentType: string = 'other'
  ) {
    await this.ensureStorageDirectory();

    // Sanitize filename
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const dealFolder = path.join(this.storageDir, `deal-${dealId}`);
    await fs.mkdir(dealFolder, { recursive: true });
    
    const filePath = `storage/documents/deal-${dealId}/${sanitizedName}`;
    const fullPath = path.join(process.cwd(), filePath);

    // Save file to disk
    await fs.writeFile(fullPath, buffer);

    return {
      id: Date.now(), // Simple ID for now
      dealId,
      fileName: sanitizedName,
      filePath,
      fileType,
      fileSize: buffer.length,
      documentType,
      uploadedBy: 1,
      uploadedAt: new Date(),
    };
  }

  /**
   * Get documents for a specific deal
   */
  async getDocumentsByDeal(dealId: number) {
    try {
      const dealDocuments = await db.select().from(documents).where(eq(documents.deal_id, dealId));
      return dealDocuments.map(doc => ({
        id: doc.id,
        fileName: doc.file_name,
        fileType: doc.file_type,
        fileSize: doc.file_size,
        dealId: doc.deal_id,
        documentType: doc.document_type,
        uploadedAt: doc.uploaded_at
      }));
    } catch (error) {
      console.error('Error fetching documents by deal:', error);
      return [];
    }
  }

  /**
   * Get a single document by ID
   */
  async getDocument(documentId: number) {
    try {
      const document = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
      
      if (!document || document.length === 0) {
        return null;
      }

      const doc = document[0];
      return {
        id: doc.id,
        fileName: doc.file_name,
        fileType: doc.file_type,
        fileSize: doc.file_size,
        dealId: doc.deal_id,
        documentType: doc.document_type,
        uploadedAt: doc.uploaded_at,
        filePath: doc.file_path
      };
    } catch (error) {
      console.error('Error fetching document:', error);
      return null;
    }
  }

  /**
   * Download document file content
   */
  async downloadDocument(documentId: number): Promise<Buffer | null> {
    try {
      const document = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
      
      if (!document || document.length === 0) {
        return null;
      }

      const doc = document[0];
      const fullPath = path.join(process.cwd(), doc.file_path);
      
      return await fs.readFile(fullPath);
    } catch (error) {
      console.error('Error downloading document:', error);
      return null;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      byType: {} as Record<string, number>,
    };

    try {
      const files = await fs.readdir(this.storageDir);
      for (const file of files) {
        const filePath = path.join(this.storageDir, file);
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          stats.totalFiles++;
          stats.totalSize += stat.size;
          
          const ext = path.extname(file).toLowerCase();
          stats.byType[ext] = (stats.byType[ext] || 0) + 1;
        }
      }
    } catch (error) {
      console.error('Error getting storage stats:', error);
    }

    return stats;
  }
}

export const documentManager = new DocumentManagerService();