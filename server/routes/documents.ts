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
import { documents } from '@shared/schema';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import multer from 'multer';
import { db } from '../db';
import { eq } from 'drizzle-orm';

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
    cb(null, `${uniqueId}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
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
        res.status(500).json({ message: 'Error serving document', error: 'streaming_error' });
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
          res.status(500).json({ message: 'Error serving document', error: 'streaming_error' });
        });
        
        fileStream.pipe(res);
        return;
      }
    }
    
    // Still no file found - return a proper JSON response with status code
    console.log(`No file found for: ${document.fileName} at ${document.filePath}. Returning not found error.`);
    
    // Log this as an orphaned record that should be flagged
    try {
      // Add a note to timeline to inform team members about the missing file
      const storage = StorageFactory.getStorage();
      
      // If document was recently created (within last 24 hours), it may be an upload issue
      const creationTime = new Date(document.uploadedAt).getTime();
      const currentTime = new Date().getTime();
      const isRecent = (currentTime - creationTime) < (24 * 60 * 60 * 1000); // 24 hours
      
      if (isRecent) {
        // For recent documents, add a timeline event so the team knows there was an upload issue
        await storage.createTimelineEvent({
          dealId: document.dealId,
          eventType: 'note',
          content: `Document upload issue: The file "${document.fileName}" was not found on the server. The document record exists in the database, but the actual file is missing.`,
          createdBy: req.user?.id || 1, // Use authenticated user or default to admin
          metadata: { documentId: [document.id] }
        }).catch(err => {
          console.error('Failed to create timeline event for missing document:', err);
        });
      }
    } catch (err) {
      console.error('Error handling orphaned document record:', err);
    }
    
    // Return a JSON response for API clients
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(404).json({ 
        message: 'Document file not found', 
        error: 'file_not_found',
        fileName: document.fileName,
        documentId: document.id,
        filePath: document.filePath,
        uploadedBy: document.uploadedBy,
        uploadedAt: document.uploadedAt
      });
    }
    
    // Return a user-friendly HTML response for browsers
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
      <div style="font-size: 11px; color: #666; margin-top: 40px; text-align: left; background: #f5f5f5; padding: 10px; border-radius: 4px; max-width: 400px; margin-left: auto; margin-right: auto;">
        <p style="margin: 0 0 5px 0;">Document ID: ${document.id}</p>
        <p style="margin: 0 0 5px 0;">Uploaded by: User #${document.uploadedBy}</p>
        <p style="margin: 0 0 5px 0;">Uploaded on: ${new Date(document.uploadedAt).toLocaleString()}</p>
        <p style="margin: 0;">Path: ${document.filePath}</p>
      </div>
    </body></html>`);

  } catch (error) {
    console.error('Error downloading document:', error);
    return res.status(500).json({ message: 'Failed to download document' });
  }
});

// Upload a document - requires authentication
router.post('/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    console.log('Received document upload request:', req.body);
    console.log('File info:', req.file);
    
    // Get the authenticated user from the request
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'You must be logged in to upload documents' });
    }
    
    // Access the uploaded file via req.file and form fields via req.body
    const storageClient = StorageFactory.getStorage();
    
    // Get form fields from request body
    const { dealId, documentType, description } = req.body;
    
    // If we don't have a file or required fields, return an error
    if (!req.file || !dealId || !documentType) {
      console.error('Missing required fields:', { file: !!req.file, dealId, documentType });
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if the deal exists
    const deal = await storageClient.getDeal(parseInt(dealId));
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Use file information from multer
    const fileName = req.file.originalname;
    const fileType = req.file.mimetype;
    const fileSize = req.file.size;
    
    // The file path is now controlled by multer
    // The file is saved to public/uploads/<uniqueId>-<originalname>
    const filePath = `/uploads/${path.basename(req.file.path)}`;
    
    const documentData = {
      dealId: parseInt(dealId),
      fileName,
      fileType,
      fileSize,
      filePath,
      uploadedBy: user.id, // Use the authenticated user's ID
      documentType,
      description: description || null,
      uploadedAt: new Date()
    };
    
    console.log('Creating document with data:', documentData);
    const document = await storageClient.createDocument(documentData);
    console.log('Document created successfully:', document);
    
    // Also create a timeline event for the document upload
    await storageClient.createTimelineEvent({
      dealId: parseInt(dealId),
      eventType: 'document_upload',
      content: `Document uploaded: ${fileName}`,
      createdBy: user.id, // Use the authenticated user's ID
      metadata: { documentId: [document.id] }
    });
    
    return res.status(201).json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    return res.status(500).json({ message: 'Failed to upload document' });
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
    
    // Create a timeline event for the deletion if we have user info
    if (req.user) {
      await storage.createTimelineEvent({
        dealId: document.dealId,
        eventType: 'note',
        content: `Document deleted: ${document.fileName}`,
        createdBy: req.user.id,
        metadata: { documentId: [document.id] }
      }).catch(err => {
        console.error('Failed to create timeline event for document deletion:', err);
      });
    }
    
    return res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ message: 'Failed to delete document' });
  }
});

// Utility endpoint to check if a document file exists - requires admin authentication
router.get('/check-file/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    // Only allow admins and partners to use this endpoint
    if (req.user?.role !== 'admin' && req.user?.role !== 'partner') {
      return res.status(403).json({ message: 'Only admins and partners can check document file status' });
    }
    
    const storage = StorageFactory.getStorage();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found in database' });
    }
    
    // Check if the file exists
    const actualFilePath = path.join(process.cwd(), 'public', document.filePath);
    const fileExists = fs.existsSync(actualFilePath);
    
    // Try alternative paths if the primary path doesn't exist
    let alternativePathFound = false;
    let alternativePathLocation = '';
    const alternativePaths = [
      path.join(process.cwd(), 'public/uploads', path.basename(document.filePath)),
      path.join(process.cwd(), 'public/uploads', document.fileName)
    ];
    
    for (const altPath of alternativePaths) {
      if (fs.existsSync(altPath) && !fileExists) {
        alternativePathFound = true;
        alternativePathLocation = altPath;
        break;
      }
    }
    
    return res.status(200).json({
      documentId: document.id,
      fileName: document.fileName,
      fileSize: document.fileSize,
      filePath: document.filePath,
      fileExists: fileExists,
      alternativePathFound: alternativePathFound,
      alternativePathLocation: alternativePathFound ? alternativePathLocation : null,
      uploadedBy: document.uploadedBy,
      uploadedAt: document.uploadedAt,
      dealId: document.dealId
    });
  } catch (error) {
    console.error('Error checking document file:', error);
    return res.status(500).json({ message: 'Failed to check document file' });
  }
});

// Admin endpoint to check all documents in the system
router.get('/check-all-files', requireAuth, async (req: Request, res: Response) => {
  try {
    // Only allow admins to use this endpoint
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can check all document files' });
    }
    
    const storage = StorageFactory.getStorage();
    
    // Get all documents from all deals
    const deals = await storage.getDeals();
    
    // Define the orphaned document type
    type OrphanedDocument = {
      documentId: number;
      fileName: string;
      dealId: number;
      dealName: string;
      filePath: string;
      uploadedBy: number;
      uploadedAt: Date;
    };
    
    // Define the results type with proper typing
    const results: {
      totalDocuments: number;
      filesFound: number;
      filesMissing: number;
      alternativePathsFound: number;
      orphanedDocuments: OrphanedDocument[];
      summary: {
        percentageFound?: number;
        percentageMissing?: number;
        percentageAlternativePath?: number;
      };
    } = {
      totalDocuments: 0,
      filesFound: 0,
      filesMissing: 0,
      alternativePathsFound: 0,
      orphanedDocuments: [],
      summary: {}
    };
    
    // Process each deal
    for (const deal of deals) {
      const documents = await storage.getDocumentsByDeal(deal.id);
      
      // Skip deals with no documents
      if (!documents || documents.length === 0) {
        continue;
      }
      
      results.totalDocuments += documents.length;
      
      // Check each document
      for (const document of documents) {
        // Check if the file exists
        const actualFilePath = path.join(process.cwd(), 'public', document.filePath);
        const fileExists = fs.existsSync(actualFilePath);
        
        if (fileExists) {
          results.filesFound++;
          continue;
        }
        
        // Try alternative paths if the primary path doesn't exist
        let alternativePathFound = false;
        let alternativePathLocation = '';
        const alternativePaths = [
          path.join(process.cwd(), 'public/uploads', path.basename(document.filePath)),
          path.join(process.cwd(), 'public/uploads', document.fileName)
        ];
        
        for (const altPath of alternativePaths) {
          if (fs.existsSync(altPath)) {
            alternativePathFound = true;
            alternativePathLocation = altPath;
            results.alternativePathsFound++;
            break;
          }
        }
        
        if (!alternativePathFound) {
          results.filesMissing++;
          results.orphanedDocuments.push({
            documentId: document.id,
            fileName: document.fileName,
            dealId: document.dealId,
            dealName: deal.name,
            filePath: document.filePath,
            uploadedBy: document.uploadedBy,
            uploadedAt: document.uploadedAt
          });
        }
      }
    }
    
    // Calculate summary
    results.summary = {
      percentageFound: Math.round((results.filesFound / results.totalDocuments) * 100),
      percentageMissing: Math.round((results.filesMissing / results.totalDocuments) * 100),
      percentageAlternativePath: Math.round((results.alternativePathsFound / results.totalDocuments) * 100)
    };
    
    return res.status(200).json(results);
  } catch (error: any) {
    console.error('Error checking all documents:', error);
    return res.status(500).json({ 
      message: 'Failed to check all documents', 
      error: error.message || 'Unknown error' 
    });
  }
});

// Admin endpoint to fix a document by updating its path to match an existing file
router.post('/fix-document/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    // Only allow admins to use this endpoint
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can fix document paths' });
    }
    
    const storage = StorageFactory.getStorage();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found in database' });
    }
    
    const { newFilePath, action } = req.body;
    
    // If action is delete, delete the document record
    if (action === 'delete') {
      const deleted = await storage.deleteDocument(id);
      if (!deleted) {
        return res.status(500).json({ message: 'Failed to delete document' });
      }
      
      // Create a timeline event for the deletion
      await storage.createTimelineEvent({
        dealId: document.dealId,
        eventType: 'note',
        content: `Document record deleted (missing file): ${document.fileName}`,
        createdBy: req.user.id,
        metadata: { documentId: [document.id] }
      }).catch(err => {
        console.error('Failed to create timeline event for document deletion:', err);
      });
      
      return res.status(200).json({ 
        message: 'Document record deleted successfully',
        action: 'delete',
        documentId: id
      });
    }
    
    // If action is update, update the document path
    if (action === 'update' && newFilePath) {
      // Make sure the new file path exists
      const newFullPath = path.join(process.cwd(), 'public', newFilePath);
      if (!fs.existsSync(newFullPath)) {
        return res.status(400).json({ 
          message: 'The new file path does not exist on the server',
          providedPath: newFilePath,
          fullPath: newFullPath
        });
      }
      
      // Update the document record with the new path
      const updatedDocument = await db.update(documents)
        .set({ filePath: newFilePath })
        .where(eq(documents.id, id))
        .returning()
        .then(results => results[0]);
      
      if (!updatedDocument) {
        return res.status(500).json({ message: 'Failed to update document path' });
      }
      
      // Create a timeline event for the path update
      await storage.createTimelineEvent({
        dealId: document.dealId,
        eventType: 'note',
        content: `Document path updated: ${document.fileName} (path was fixed by admin)`,
        createdBy: req.user.id,
        metadata: { documentId: [document.id] }
      }).catch(err => {
        console.error('Failed to create timeline event for document path update:', err);
      });
      
      return res.status(200).json({ 
        message: 'Document path updated successfully',
        action: 'update',
        documentId: id,
        oldPath: document.filePath,
        newPath: newFilePath
      });
    }
    
    return res.status(400).json({ 
      message: 'Invalid action or missing newFilePath parameter', 
      allowedActions: ['delete', 'update'] 
    });
  } catch (error: any) {
    console.error('Error fixing document:', error);
    return res.status(500).json({ 
      message: 'Failed to fix document', 
      error: error.message || 'Unknown error' 
    });
  }
});

export default router;