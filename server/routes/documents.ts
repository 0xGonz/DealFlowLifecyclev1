import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseStorage } from '../database-storage';
import { DocumentService } from '../modules/documents/service';

const router = Router();
const storage = new DatabaseStorage();

// Simple auth check middleware
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Configure multer for file uploads
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const sanitizedName = file.originalname.toLowerCase().replace(/[^a-z0-9.-]/g, '_');
    const filename = `${uniqueId}-${sanitizedName}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: uploadStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.ppt', '.pptx'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${fileExt} not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

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

// Download document endpoint - COMPREHENSIVE FIX
router.get('/:id/download', requireAuth, async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    console.log(`📥 Download request for document ID: ${documentId}`);
    
    // Get document with comprehensive logging
    let document;
    try {
      document = await storage.getDocument(documentId);
      console.log(`🔍 Database query completed for document ${documentId}`);
      console.log(`📄 Raw document result:`, JSON.stringify(document, null, 2));
    } catch (dbError) {
      console.error(`💥 Database error for document ${documentId}:`, dbError);
      return res.status(500).json({ message: 'Database error', error: String(dbError) });
    }
    
    if (!document) {
      console.log(`❌ Document ${documentId} not found in database`);
      return res.status(404).json({ message: 'Document not found' });
    }

    // Extract filename and file path - use proper schema field names
    const fileName = document.fileName;
    const filePath = document.filePath;
    
    console.log(`📄 Extracted fileName: ${fileName}`);
    console.log(`📍 Extracted filePath: ${filePath}`);
    
    if (!fileName && !filePath) {
      console.error(`❌ Document ${documentId} has no valid file name or path!`);
      return res.status(500).json({ message: 'Document missing file information' });
    }
    
    // Build potential file paths
    const possiblePaths = [];
    
    if (filePath) {
      possiblePaths.push(
        path.join(process.cwd(), filePath),
        path.join(process.cwd(), 'public', filePath),
        path.join(process.cwd(), 'uploads', filePath)
      );
    }
    
    if (fileName) {
      possiblePaths.push(
        path.join(process.cwd(), 'uploads', fileName),
        path.join(process.cwd(), 'public', 'uploads', fileName),
        path.join(process.cwd(), 'data', 'uploads', fileName)
      );
    }
    
    let resolvedFilePath = null;
    
    for (const testPath of possiblePaths) {
      console.log(`🔍 Checking path: ${testPath}`);
      if (fs.existsSync(testPath)) {
        resolvedFilePath = testPath;
        console.log(`✅ Found file at: ${testPath}`);
        break;
      }
    }
    
    if (!resolvedFilePath) {
      console.error(`💥 File not found in any location for document ${documentId}`);
      console.error(`Searched paths:`, possiblePaths);
      return res.status(404).json({ 
        message: 'File not found on disk',
        originalPath: document.filePath,
        searchedPaths: possiblePaths
      });
    }

    // Set appropriate headers
    const fileExtension = path.extname(document.fileName).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.txt': 'text/plain'
    };

    const mimeType = mimeTypes[fileExtension] || 'application/octet-stream';
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
    
    // Set file size header
    try {
      const stats = fs.statSync(resolvedFilePath);
      res.setHeader('Content-Length', stats.size);
    } catch (err) {
      console.warn('Could not get file stats:', err);
    }
    
    console.log(`📁 Serving file: ${document.fileName} from ${resolvedFilePath}`);
    
    // Create and pipe file stream
    const fileStream = fs.createReadStream(resolvedFilePath);
    
    fileStream.on('error', (err) => {
      console.error('Error streaming document:', err);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Stream error',
          message: 'Error accessing the document file'
        });
      }
    });
    
    fileStream.pipe(res);
  } catch (error) {
    const err = error as Error;
    console.error(`💥 ERROR in download route for document ${req.params.id}:`, err);
    return res.status(500).json({ 
      message: 'Failed to download document', 
      error: err.message 
    });
  }
});

// Delete document
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    console.log(`🗑️ Delete request for document ${documentId}`);
    
    // Check if document exists first
    const document = await storage.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Delete from database
    const success = await DocumentService.deleteDocument(documentId);
    
    if (success) {
      console.log(`✅ Successfully deleted document ${documentId}`);
      res.json({ success: true, message: 'Document deleted successfully' });
    } else {
      console.error(`❌ Failed to delete document ${documentId}`);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Update document metadata (support both PUT and PATCH)
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    const { description, documentType } = req.body;
    
    console.log(`📝 PATCH request for document ${documentId}`, { description, documentType });
    
    // Check if document exists first
    const document = await storage.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Update document
    const updatedDocument = await DocumentService.updateDocument(documentId, {
      description,
      documentType
    });
    
    console.log(`✅ Successfully updated document ${documentId}`);
    res.json(updatedDocument);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    const { description, documentType } = req.body;
    
    console.log(`📝 Update request for document ${documentId}`, { description, documentType });
    
    // Check if document exists first
    const document = await storage.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Update document
    const updatedDocument = await DocumentService.updateDocument(documentId, {
      description,
      documentType
    });
    
    console.log(`✅ Successfully updated document ${documentId}`);
    res.json(updatedDocument);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Document upload endpoint
router.post('/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    console.log('📤 Upload request received');
    console.log('📤 Session data:', req.session);
    console.log('📤 User ID from session:', req.session?.userId);
    
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { dealId, description, documentType } = req.body;
    
    if (!dealId) {
      console.log('❌ No deal ID provided');
      return res.status(400).json({ error: 'Deal ID is required' });
    }

    console.log(`📤 Uploading document for deal ${dealId}:`, {
      filename: req.file.originalname,
      size: req.file.size,
      type: documentType,
      userId: req.session?.userId
    });

    // Ensure user ID is available
    if (!req.session?.userId) {
      console.log('❌ No user ID in session');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Create document record in database
    const documentData = {
      dealId: parseInt(dealId),
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: `uploads/${req.file.filename}`,
      uploadedBy: req.session.userId,
      description: description || '',
      documentType: documentType || 'other'
    };

    console.log('💾 Creating document in database:', documentData);
    const newDocument = await storage.createDocument(documentData);
    
    // Add timeline event for document upload
    await storage.createTimelineEvent({
      dealId: parseInt(dealId),
      eventType: 'document_upload',
      content: `${req.session.username || 'User'} uploaded document: ${req.file.originalname}`,
      createdBy: req.session.userId,
      metadata: {
        documentId: newDocument.id,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        documentType: documentType || 'other'
      }
    });
    
    console.log(`✅ Document uploaded successfully: ${req.file.originalname}`);
    
    res.json({
      success: true,
      document: newDocument,
      id: newDocument.id,
      documentId: newDocument.id,
      fileName: newDocument.fileName,
      fileType: newDocument.fileType,
      documentType: newDocument.documentType,
      message: 'Document uploaded successfully'
    });

  } catch (error) {
    console.error('💥 Error uploading document:', error);
    
    // Clean up the uploaded file if database operation failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to upload document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;