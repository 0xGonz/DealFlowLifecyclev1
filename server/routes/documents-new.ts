import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import { DatabaseStorage } from '../database-storage';
import { DocumentService } from '../services/document.service';
import { FileManagerService } from '../services/file-manager.service';
import { DocumentUploadService } from '../services/document-upload.service';

const router = Router();
const storage = new DatabaseStorage();

// Simple auth check middleware
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

/**
 * SYSTEMATIC FILE MANAGEMENT SOLUTION
 * This addresses all the core issues with document uploads and retrieval
 */

// Centralized upload configuration
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.ppt', '.pptx'];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer with consistent file handling
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueId = crypto.randomUUID();
    const sanitizedName = file.originalname.toLowerCase().replace(/[^a-z0-9.-]/g, '_');
    const filename = `${uniqueId}-${sanitizedName}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${fileExt} not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
  }
});

// Utility functions for file resolution
function resolveFilePath(storedPath: string, fileName?: string): string | null {
  const possiblePaths: string[] = [];
  
  // Primary: Use stored path
  if (storedPath) {
    const normalizedPath = storedPath.startsWith('/') ? storedPath.substring(1) : storedPath;
    possiblePaths.push(path.join(process.cwd(), normalizedPath));
  }
  
  // Fallback: Look in uploads directory
  if (fileName) {
    possiblePaths.push(path.join(UPLOAD_DIR, fileName));
  }
  
  // Fallback: Extract filename from path
  if (storedPath) {
    const extractedFilename = path.basename(storedPath);
    possiblePaths.push(path.join(UPLOAD_DIR, extractedFilename));
  }

  // Check each path
  for (const testPath of possiblePaths) {
    try {
      if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
        return testPath;
      }
    } catch {
      continue;
    }
  }
  
  return null;
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Get documents for a specific deal
router.get('/deal/:dealId', requireAuth, async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    console.log(`📁 Fetching documents for deal ${dealId}`);
    
    const documents = await storage.getDocumentsByDeal(dealId);
    console.log(`📋 Found ${documents.length} documents for deal ${dealId}`);
    
    res.json(documents);
  } catch (error) {
    console.error('Error fetching deal documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get specific document metadata
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    const document = await storage.getDocument(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// ENHANCED DOWNLOAD ENDPOINT - Systematic file resolution
router.get('/:id/download', requireAuth, async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    console.log(`📥 SYSTEMATIC DOWNLOAD: Document ID ${documentId}`);
    
    // Get document from database
    const document = await storage.getDocument(documentId);
    if (!document) {
      console.log(`❌ Document ${documentId} not found in database`);
      return res.status(404).json({ message: 'Document not found' });
    }

    console.log(`📄 Document metadata:`, {
      id: document.id,
      fileName: document.fileName,
      filePath: document.filePath,
      fileType: document.fileType
    });

    // Resolve actual file location
    const resolvedPath = resolveFilePath(document.filePath, document.fileName);
    
    if (!resolvedPath) {
      console.error(`💥 SYSTEMATIC ERROR: File not found for document ${documentId}`);
      const searchedPaths = [
        path.join(process.cwd(), document.filePath || ''),
        path.join(UPLOAD_DIR, document.fileName || ''),
        path.join(UPLOAD_DIR, path.basename(document.filePath || ''))
      ];
      
      return res.status(404).json({
        message: 'File not found',
        error: 'The document file is missing from the server. Please re-upload the document.',
        documentId,
        storedPath: document.filePath,
        fileName: document.fileName,
        searchedPaths,
        systematic: true
      });
    }

    console.log(`✅ SYSTEMATIC SUCCESS: File resolved to ${resolvedPath}`);

    // Set proper headers
    const mimeType = getMimeType(document.fileName);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
    
    // Set file size header
    try {
      const stats = fs.statSync(resolvedPath);
      res.setHeader('Content-Length', stats.size);
    } catch (err) {
      console.warn('Could not get file stats:', err);
    }
    
    console.log(`📁 Serving file: ${document.fileName} from ${resolvedPath}`);
    
    // Stream file
    const fileStream = fs.createReadStream(resolvedPath);
    fileStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error', message: 'Error accessing the document file' });
      }
    });
    
    fileStream.pipe(res);
    
  } catch (error) {
    console.error(`💥 SYSTEMATIC ERROR in download route:`, error);
    return res.status(500).json({ 
      message: 'Failed to download document', 
      error: error instanceof Error ? error.message : 'Unknown error',
      systematic: true
    });
  }
});

// ENHANCED UPLOAD ENDPOINT - Systematic file handling
router.post('/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    console.log('📤 SYSTEMATIC UPLOAD: Request received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { dealId, description, documentType } = req.body;
    
    if (!dealId) {
      return res.status(400).json({ error: 'Deal ID is required' });
    }

    if (!req.session?.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`📤 SYSTEMATIC UPLOAD: Processing file for deal ${dealId}:`, {
      filename: req.file.originalname,
      size: req.file.size,
      savedAs: req.file.filename,
      path: req.file.path
    });

    // Validate document type
    const validDocumentTypes = [
      'pitch_deck', 'financial_model', 'legal_document', 'diligence_report',
      'investor_report', 'term_sheet', 'cap_table', 'subscription_agreement', 'other'
    ];
    const validatedDocumentType = validDocumentTypes.includes(documentType) ? documentType : 'other';

    // Create document record with systematic path handling
    const documentData = {
      dealId: parseInt(dealId),
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: `uploads/${req.file.filename}`, // Consistent path format
      uploadedBy: req.session.userId,
      description: description || null,
      documentType: validatedDocumentType as any
    };

    console.log('💾 SYSTEMATIC UPLOAD: Creating database record:', documentData);
    const newDocument = await storage.createDocument(documentData);
    
    // Add timeline event
    await storage.createTimelineEvent({
      dealId: parseInt(dealId),
      eventType: 'document_upload' as any,
      content: `${req.session.username || 'User'} uploaded document: ${req.file.originalname}`,
      createdBy: req.session.userId,
      metadata: {
        documentId: newDocument.id,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        documentType: validatedDocumentType
      }
    });
    
    console.log(`✅ SYSTEMATIC UPLOAD: Success for ${req.file.originalname}`);
    
    res.json({
      success: true,
      document: newDocument,
      id: newDocument.id,
      systematic: true,
      message: 'Document uploaded successfully'
    });

  } catch (error) {
    console.error('💥 SYSTEMATIC UPLOAD ERROR:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to upload document',
      message: error instanceof Error ? error.message : 'Unknown error',
      systematic: true
    });
  }
});

// Delete document
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    console.log(`🗑️ SYSTEMATIC DELETE: Document ${documentId}`);
    
    const document = await storage.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Delete file from filesystem
    const filePath = resolveFilePath(document.filePath, document.fileName);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ File deleted: ${filePath}`);
    }
    
    // Delete from database
    const success = await DocumentService.deleteDocument(documentId);
    
    if (success) {
      console.log(`✅ SYSTEMATIC DELETE: Success for document ${documentId}`);
      res.json({ success: true, message: 'Document deleted successfully', systematic: true });
    } else {
      res.status(500).json({ error: 'Failed to delete document' });
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Update document metadata
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    const { description, documentType } = req.body;
    
    const document = await storage.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const updatedDocument = await DocumentService.updateDocument(documentId, {
      description,
      documentType
    });
    
    res.json({ ...updatedDocument, systematic: true });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

export default router;