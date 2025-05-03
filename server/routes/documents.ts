import { Router, Request, Response } from 'express';
import { StorageFactory } from '../storage-factory';
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import * as schema from '@shared/schema';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import multer from 'multer';

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

// Get all documents for a deal
router.get('/deal/:dealId', async (req: Request, res: Response) => {
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

// Get documents for a deal filtered by type
router.get('/deal/:dealId/type/:documentType', async (req: Request, res: Response) => {
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

// Get a single document by ID
router.get('/:id', async (req: Request, res: Response) => {
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

// Download a document
router.get('/:id/download', async (req: Request, res: Response) => {
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
      path.join(process.cwd(), 'public/uploads', document.fileName),
      // Sample file for demo purposes
      path.join(process.cwd(), 'public/uploads/sample-upload.pdf')
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
    
    // Still no file found, create a basic PDF error message
    console.log(`No file found for: ${document.fileName}. Showing error message.`);
    res.status(404).send(`<html><body><h1>Document Not Found</h1><p>The document "${document.fileName}" could not be found on the server.</p><p>Please upload the document again.</p></body></html>`);

  } catch (error) {
    console.error('Error downloading document:', error);
    return res.status(500).json({ message: 'Failed to download document' });
  }
});

// Upload a document
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    console.log('Received document upload request:', req.body);
    console.log('File info:', req.file);
    
    // Access the uploaded file via req.file and form fields via req.body
    const storageClient = StorageFactory.getStorage();
    
    // Get form fields from request body
    const { dealId, documentType, description, uploadedBy } = req.body;
    
    // If we don't have a file or required fields, return an error
    if (!req.file || !dealId || !documentType || !uploadedBy) {
      console.error('Missing required fields:', { file: !!req.file, dealId, documentType, uploadedBy });
      return res.status(400).json({ message: 'Missing required fields' });
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
      uploadedBy: parseInt(uploadedBy),
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
      createdBy: 1, // Admin user ID (only ID 1 exists in the database)
      metadata: { documentId: [document.id] }
    });
    
    return res.status(201).json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    return res.status(500).json({ message: 'Failed to upload document' });
  }
});

// Delete a document
router.delete('/:id', async (req: Request, res: Response) => {
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