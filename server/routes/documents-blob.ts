import { Router } from 'express';
import multer from 'multer';
import { 
  saveDocumentBlob, 
  getDocumentBlob, 
  listDocumentsByDeal, 
  deleteDocumentBlob 
} from '../services/document-blob.service';
import { requireAuth, getCurrentUser } from '../utils/auth';

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types for now, can be restricted later
    cb(null, true);
  },
});

// General upload endpoint for documents without dealId (used during deal creation)
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { originalname, mimetype, size, buffer } = req.file;
    const { description, documentType, dealId } = req.body;

    // If dealId is provided, use it; otherwise, set to null for temporary storage
    const targetDealId = dealId ? parseInt(dealId) : null;

    const document = await saveDocumentBlob(
      targetDealId,
      originalname,
      mimetype,
      size,
      buffer,
      user.id,
      description,
      documentType
    );

    res.json({
      success: true,
      document: {
        id: document.id,
        fileName: document.fileName,
        documentType: document.documentType,
        fileSize: document.fileSize,
        uploadedAt: document.uploadedAt
      }
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Upload document as blob to PostgreSQL for specific deal
router.post('/:dealId/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const dealId = parseInt(req.params.dealId);
    const user = await getCurrentUser(req);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { originalname, mimetype, size, buffer } = req.file;
    const { description, documentType } = req.body;

    const document = await saveDocumentBlob(
      dealId,
      originalname,
      mimetype,
      size,
      buffer,
      user.id,
      description,
      documentType
    );

    res.json(document);
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Download document blob from PostgreSQL
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const document = await getDocumentBlob(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.setHeader('Content-Type', document.fileType);
    res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
    res.send(document.fileData);
  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// List documents for a deal
router.get('/deal/:dealId', requireAuth, async (req, res) => {
  try {
    const dealId = parseInt(req.params.dealId);
    const documents = await listDocumentsByDeal(dealId);
    
    // Transform the response to match frontend expectations
    const transformedDocs = documents.map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      dealId: doc.dealId,
      documentType: 'other' // Default value for compatibility
    }));
    
    res.json(transformedDocs);
  } catch (error) {
    console.error('Document list error:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

// Delete document
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await deleteDocumentBlob(id);

    if (!success) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Document delete error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;