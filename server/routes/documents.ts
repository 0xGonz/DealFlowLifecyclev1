import { Router, Request, Response } from 'express';
import multer from 'multer';
import { StorageFactory } from '../storage-factory';
import { requireAuth } from '../utils/auth';
import { FileManagerService } from '../services/file-manager.service';
import { DocumentUploadService } from '../services/document-upload.service';

const router = Router();
const storage = StorageFactory.getStorage();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Excel, CSV, and Word documents are allowed.'));
    }
  }
});

// Get documents for a deal
router.get('/deal/:dealId', requireAuth, async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      return res.status(400).json({ error: 'Invalid deal ID' });
    }

    const documents = await storage.getDocumentsByDeal(dealId);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get a specific document
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Upload a document
router.post('/upload/:dealId', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      return res.status(400).json({ error: 'Invalid deal ID' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const uploadService = new DocumentUploadService(storage);
    
    const options = {
      description: req.body.description || '',
      documentType: req.body.documentType || 'other',
      username: req.session?.username || 'Unknown User'
    };

    const document = await uploadService.uploadDocument(req.file, dealId, userId, options);
    
    res.status(201).json({
      success: true,
      document
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Download a document
router.get('/:id/download', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const filePath = FileManagerService.resolveDocumentPath(document.filePath);
    
    res.download(filePath, document.fileName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        if (!res.headersSent) {
          res.status(404).json({ error: 'File not found' });
        }
      }
    });
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Delete a document
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete physical file
    try {
      const filePath = FileManagerService.resolveDocumentPath(document.filePath);
      await FileManagerService.deleteFile(filePath);
    } catch (fileError) {
      console.warn('Could not delete physical file:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    const deleted = await storage.deleteDocument(id);
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete document' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;