import { Router, Request, Response, NextFunction } from 'express';
import { Express } from 'express-serve-static-core';

declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
      user?: any;
    }
  }
}
import { StorageFactory } from '../storage-factory';
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import * as schema from '@shared/schema';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import multer from 'multer';

// Import the central authentication middleware
import { requireAuth as centralRequireAuth } from '../utils/auth';

// Use the central authentication middleware to ensure consistency
const requireAuth = centralRequireAuth;

// Middleware to sanitize file paths and ensure they don't escape the intended directory
const sanitizeFilePath = (filePath: string): string => {
  // Remove any parent directory traversal attempts
  const sanitized = path.normalize(filePath).replace(/^\/+|\.\.+\//g, '');
  return sanitized;
};

const router = Router();

// Define allowed MIME types for security
const ALLOWED_MIME_TYPES = [
  // PDF documents
  'application/pdf',
  // Office documents
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  // Text files
  'text/plain',
  'text/csv',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  // ZIP archives
  'application/zip',
  'application/x-zip-compressed'
];

// Sanitize filename to prevent security issues
const sanitizeFilename = (filename: string): string => {
  // Remove path traversal characters and maintain only safe characters
  return filename
    .replace(/[\/\\?%*:|"<>]/g, '_') // Replace unsafe chars with underscore
    .replace(/\s+/g, '_')           // Replace spaces with underscores
    .toLowerCase();                  // Convert to lowercase for consistency
};

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    // Ensure the upload directory exists
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to prevent overwriting
    const uniqueId = crypto.randomUUID();
    // Sanitize the original filename before appending to UUID
    const sanitizedFilename = sanitizeFilename(file.originalname);
    cb(null, `${uniqueId}-${sanitizedFilename}`);
  }
});

// Custom file filter for MIME type validation
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if the file's MIME type is in our allowed list
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    // Accept the file
    cb(null, true);
  } else {
    // Reject the file with custom error message
    cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
    files: 1                     // Maximum number of files per upload
  },
  fileFilter
});

// Get all documents for a deal - requires authentication
router.get('/deal/:dealId', requireAuth, async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: 'Invalid deal ID' });
    }
    
    const storage = StorageFactory.getStorage();
    const documents = await storage.getDocumentsByDeal(dealId);
    return res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// Get documents for a deal filtered by type - requires authentication
router.get('/deal/:dealId/type/:documentType', requireAuth, async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    const { documentType } = req.params;
    
    if (isNaN(dealId)) {
      return res.status(400).json({ message: 'Invalid deal ID' });
    }
    
    const storage = StorageFactory.getStorage();
    const documents = await storage.getDocumentsByType(dealId, documentType);
    return res.json(documents);
  } catch (error) {
    console.error('Error fetching documents by type:', error);
    return res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// Get a single document by ID - requires authentication
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    const storage = StorageFactory.getStorage();
    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    return res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    return res.status(500).json({ message: 'Failed to fetch document' });
  }
});

// Download a document - requires authentication
router.get('/:id/download', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    const storage = StorageFactory.getStorage();
    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Set appropriate content type
    res.setHeader('Content-Type', document.fileType);
    
    // For PDFs, set Content-Disposition to inline (displays in browser)
    if (document.fileType === 'application/pdf' || document.fileName.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.fileName)}"`);
    } else {
      // For other file types, set to attachment (forces download)
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.fileName)}"`);
    }
    
    // Try to serve the actual file if it exists in the uploads directory
    const actualFilePath = path.join(process.cwd(), 'public', document.filePath);
    
    // Log the path we're trying to serve from
    console.log(`Attempting to serve document from: ${actualFilePath}`);
    
    // Check if the actual file exists first
    if (fs.existsSync(actualFilePath)) {
      console.log(`Serving actual file from: ${actualFilePath}`);
      // Stream the file instead of loading it into memory
      const fileStream = fs.createReadStream(actualFilePath);
      fileStream.pipe(res);
      
      // Handle stream errors
      fileStream.on('error', (err) => {
        console.error('Error streaming document:', err);
        res.status(500).json({ message: 'Error serving document' });
      });
      return;
    }
    
    // If the file doesn't exist in the expected location, check for it with different paths/formats
    // This helps handle cases where filenames have spaces or special characters
    const alternativePaths = [
      // Try without encodeURIComponent in the filename
      path.join(process.cwd(), 'public/uploads', path.basename(document.filePath)),
      // Just the filename without the UUID prefix
      path.join(process.cwd(), 'public/uploads', document.fileName)
      // Removed the sample fallback PDF to avoid confusion
    ];
    
    // Try each alternative path
    let foundFile = false;
    for (const altPath of alternativePaths) {
      if (fs.existsSync(altPath) && !foundFile) {
        foundFile = true;
        console.log(`Serving file from alternative location: ${altPath}`);
        const fileStream = fs.createReadStream(altPath);
        
        // Handle stream errors
        fileStream.on('error', (err) => {
          console.error('Error streaming document from alternative path:', err);
          foundFile = false;
          res.status(500).json({ message: 'Error serving document' });
        });
        
        fileStream.pipe(res);
        return;
      }
    }
    
    // Still no file found, create a clear error message
    console.log(`No file found for: ${document.fileName} at ${document.filePath}. Showing error message.`);
    res.status(404).send(`<html><body style="font-family: Arial, sans-serif; text-align: center; margin: 50px;">
      <h1 style="color: #d32f2f;">Document Not Found</h1>
      <p>The document "${document.fileName}" could not be found on the server.</p>
      <p>This may happen when:</p>
      <ul style="text-align: left; width: 400px; margin: 0 auto;">
        <li>The file has been deleted from the server</li>
        <li>The file was uploaded but not properly saved</li>
        <li>The file path in the database is incorrect</li>
      </ul>
      <p style="margin-top: 20px;">Please upload the document again or contact support if this issue persists.</p>
    </body></html>`);

  } catch (error) {
    console.error('Error downloading document:', error);
    return res.status(500).json({ message: 'Failed to download document' });
  }
});

// Error handler for multer errors
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // Handle Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        error: 'File too large', 
        message: 'The uploaded file exceeds the maximum size limit of 10MB.' 
      });
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        error: 'Unexpected field', 
        message: 'Please upload a single file with field name "file".' 
      });
    }
  } else if (err && err.message) {
    // This could be the file filter error with MIME type validation
    return res.status(415).json({ 
      error: 'Invalid file type', 
      message: err.message 
    });
  }
  // For other errors, pass to next error handler
  next(err);
};

// Upload a document - requires authentication
// We don't attach upload.single() directly to the route handler, but use it separately
// to allow proper error handling
router.post('/upload', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    // Get the authenticated user from the request
    const user = req.user;
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'You must be logged in to upload documents' 
      });
    }
    
    // Access the uploaded file via req.file and form fields via req.body
    const storageClient = StorageFactory.getStorage();
    
    // Get form fields from request body
    const { dealId, documentType, description } = req.body;
    
    // If we don't have a file or required fields, return an error
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Missing file',
        message: 'No file was uploaded. Please select a file to upload.' 
      });
    }
    
    if (!dealId) {
      return res.status(400).json({ 
        error: 'Missing dealId',
        message: 'A deal ID must be provided with the document upload.' 
      });
    }
    
    if (!documentType) {
      return res.status(400).json({ 
        error: 'Missing documentType',
        message: 'A document type must be specified.' 
      });
    }
    
    // Validate dealId is a number
    const dealIdNum = parseInt(dealId);
    if (isNaN(dealIdNum)) {
      return res.status(400).json({ 
        error: 'Invalid dealId',
        message: 'Deal ID must be a valid number.' 
      });
    }
    
    // Check if the deal exists
    const deal = await storageClient.getDeal(dealIdNum);
    if (!deal) {
      return res.status(404).json({ 
        error: 'Deal not found',
        message: `No deal found with ID ${dealIdNum}.` 
      });
    }
    
    // Use file information from multer
    const fileName = sanitizeFilename(req.file.originalname);
    const fileType = req.file.mimetype;
    const fileSize = req.file.size;
    
    // The file path is now controlled by multer and sanitized
    // The file is saved to public/uploads/<uniqueId>-<sanitizedFilename>
    const filePath = `/uploads/${path.basename(req.file.path)}`;
    
    const documentData = {
      dealId: dealIdNum,
      fileName,
      fileType,
      fileSize,
      filePath,
      uploadedBy: user.id, // Use the authenticated user's ID
      documentType,
      description: description || null,
      uploadedAt: new Date()
    };
    
    // Save document info to database
    const document = await storageClient.createDocument(documentData);
    
    // Also create a timeline event for the document upload
    await storageClient.createTimelineEvent({
      dealId: dealIdNum,
      eventType: 'document_upload',
      content: `Document uploaded: ${fileName}`,
      createdBy: user.id, // Use the authenticated user's ID
      metadata: { documentId: [document.id] }
    });
    
    return res.status(201).json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: 'An unexpected error occurred while uploading the document.' 
    });
  }
});

// Delete a document - requires authentication
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.getStorage();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    const deleted = await storage.deleteDocument(id);
    if (!deleted) {
      return res.status(500).json({ message: 'Failed to delete document' });
    }
    
    return res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ message: 'Failed to delete document' });
  }
});

export default router;