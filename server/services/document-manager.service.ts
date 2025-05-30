import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { documents, type Document } from '../../shared/schema.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DocumentManagerService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');

  constructor() {
    this.ensureUploadsDirectory();
  }

  private async ensureUploadsDirectory() {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
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
    // Generate unique filename
    const uniqueId = crypto.randomUUID();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${uniqueId}-${sanitizedName}`;
    const filePath = `uploads/${uniqueFileName}`;
    const fullPath = path.join(this.uploadsDir, uniqueFileName);

    // Save file to disk
    await fs.writeFile(fullPath, buffer);

    // Save metadata to database
    const [document] = await db.insert(documents).values({
      dealId,
      fileName: sanitizedName,
      filePath,
      fileType,
      fileSize: buffer.length,
      documentType,
      uploadedBy: 1, // Default to admin user for now
    }).returning();

    return document;
  }

  /**
   * Get all documents for a specific deal
   */
  async getDocumentsByDeal(dealId: number) {
    return await db.select().from(documents).where(eq(documents.dealId, dealId));
  }

  /**
   * Get a specific document by ID
   */
  async getDocument(documentId: number) {
    const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
    return document || null;
  }

  /**
   * Download document file content
   */
  async downloadDocument(documentId: number): Promise<Buffer | null> {
    const document = await this.getDocument(documentId);
    if (!document) return null;

    try {
      const fullPath = path.join(process.cwd(), document.filePath);
      return await fs.readFile(fullPath);
    } catch (error) {
      console.error('Error reading document file:', error);
      return null;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: number) {
    const document = await this.getDocument(documentId);
    if (!document) return false;

    try {
      // Delete file from disk
      const fullPath = path.join(process.cwd(), document.filePath);
      await fs.unlink(fullPath);
    } catch (error) {
      console.warn('Could not delete file from disk:', error);
    }

    // Delete from database
    await db.delete(documents).where(eq(documents.id, documentId));
    return true;
  }

  /**
   * Validate document integrity
   */
  async validateDocument(documentId: number): Promise<{
    valid: boolean;
    fileExists: boolean;
    sizeMatches: boolean;
    actualSize?: number;
  }> {
    const document = await this.getDocument(documentId);
    if (!document) {
      return { valid: false, fileExists: false, sizeMatches: false };
    }

    try {
      const fullPath = path.join(process.cwd(), document.filePath);
      const stats = await fs.stat(fullPath);
      const sizeMatches = stats.size === document.fileSize;
      
      return {
        valid: sizeMatches,
        fileExists: true,
        sizeMatches,
        actualSize: stats.size
      };
    } catch (error) {
      return {
        valid: false,
        fileExists: false,
        sizeMatches: false
      };
    }
  }

  /**
   * Clean up orphaned files (files without database records)
   */
  async cleanupOrphanedFiles(): Promise<string[]> {
    const deletedFiles: string[] = [];
    
    try {
      const allFiles = await fs.readdir(this.uploadsDir);
      const allDocuments = await db.select().from(documents);
      const validFilenames = allDocuments.map(doc => path.basename(doc.filePath));

      for (const file of allFiles) {
        if (!validFilenames.includes(file) && file !== '.gitkeep') {
          const fullPath = path.join(this.uploadsDir, file);
          await fs.unlink(fullPath);
          deletedFiles.push(file);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }

    return deletedFiles;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    const allDocuments = await db.select().from(documents);
    const totalSize = allDocuments.reduce((sum, doc) => sum + doc.fileSize, 0);
    const documentCount = allDocuments.length;
    
    // Count by deal
    const byDeal = allDocuments.reduce((acc, doc) => {
      acc[doc.dealId] = (acc[doc.dealId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Count by type
    const byType = allDocuments.reduce((acc, doc) => {
      acc[doc.documentType] = (acc[doc.documentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSize,
      documentCount,
      byDeal,
      byType,
      averageSize: documentCount > 0 ? Math.round(totalSize / documentCount) : 0
    };
  }
}

export const documentManager = new DocumentManagerService();