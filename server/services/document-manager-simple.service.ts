import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
   * Download document file content
   */
  async downloadDocument(documentId: number): Promise<Buffer | null> {
    // For now, just return null - this needs to be implemented with proper database lookup
    return null;
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