import multer from 'multer';
import { FileManagerService } from './file-manager.service';
import { DatabaseStorage } from '../database-storage';

/**
 * Document Upload Service
 * Handles file uploads with consistent storage and validation
 */
export class DocumentUploadService {
  private static storage = new DatabaseStorage();

  /**
   * Configure multer storage with standardized file handling
   */
  static getMulterConfig(): multer.Multer {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        FileManagerService.ensureUploadDir();
        cb(null, FileManagerService.getBaseUploadDir());
      },
      filename: (req, file, cb) => {
        const filename = FileManagerService.generateUniqueFilename(file.originalname);
        cb(null, filename);
      }
    });

    return multer({
      storage,
      limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
      },
      fileFilter: (req, file, cb) => {
        const validation = FileManagerService.validateUpload(file);
        if (validation.isValid) {
          cb(null, true);
        } else {
          cb(new Error(validation.error || 'Invalid file'));
        }
      }
    });
  }

  /**
   * Process uploaded file and create database record
   */
  static async processUpload(
    file: Express.Multer.File,
    dealId: number,
    userId: number,
    options: {
      description?: string;
      documentType?: string;
      username?: string;
    } = {}
  ) {
    // Validate the upload
    const validation = FileManagerService.validateUpload(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Create document record in database
    const documentData = {
      dealId,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      filePath: FileManagerService.getStoragePath(file.filename),
      uploadedBy: userId,
      description: options.description || '',
      documentType: options.documentType || 'other'
    };

    const newDocument = await this.storage.createDocument(documentData);

    // Add timeline event for document upload
    await this.storage.createTimelineEvent({
      dealId,
      eventType: 'document_upload',
      content: `${options.username || 'User'} uploaded document: ${file.originalname}`,
      createdBy: userId,
      metadata: {
        documentId: newDocument.id,
        fileName: file.originalname,
        fileType: file.mimetype,
        documentType: options.documentType || 'other'
      }
    });

    return newDocument;
  }

  /**
   * Clean up uploaded file if database operation fails
   */
  static cleanupFailedUpload(file: Express.Multer.File): void {
    if (file && file.path) {
      FileManagerService.deleteFile(file.path);
    }
  }

  /**
   * Validate upload request parameters
   */
  static validateUploadRequest(body: any): { isValid: boolean; error?: string } {
    if (!body.dealId) {
      return { isValid: false, error: 'Deal ID is required' };
    }

    const dealId = parseInt(body.dealId);
    if (isNaN(dealId) || dealId <= 0) {
      return { isValid: false, error: 'Invalid Deal ID' };
    }

    return { isValid: true };
  }
}