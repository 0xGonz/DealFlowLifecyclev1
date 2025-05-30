import { Router } from 'express';
import multer from 'multer';
import { 
  saveDocumentBlob, 
  getDocumentBlob, 
  listDocumentsByDeal, 
  deleteDocumentBlob 
} from '../services/document-blob.service';
import { pool } from '../db';

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
});

// Upload document for specific deal
router.post('/:dealId/upload', upload.single('file'), async (req, res) => {
  try {
    const dealId = parseInt(req.params.dealId);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, mimetype, size, buffer } = req.file;
    const { description, documentType } = req.body;

    const document = await saveDocumentBlob(
      dealId,
      originalname,
      mimetype,
      size,
      buffer,
      description || null,
      documentType || 'other'
    );

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        filename: document.filename,
        mimetype: document.mimetype,
        size: document.size,
        description: document.description,
        documentType: document.document_type,
        dealId: document.deal_id,
        uploadedAt: document.uploaded_at
      }
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get documents list for a deal
router.get('/:dealId', async (req, res) => {
  try {
    const dealId = parseInt(req.params.dealId);
    const documents = await listDocumentsByDeal(dealId);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Download document
router.get('/:dealId/download/:documentId', async (req, res) => {
  try {
    const dealId = parseInt(req.params.dealId);
    const documentId = parseInt(req.params.documentId);
    
    const document = await getDocumentBlob(documentId, dealId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.setHeader('Content-Type', document.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    res.setHeader('Content-Length', document.size.toString());
    res.send(document.data);

  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Delete document
router.delete('/:dealId/:documentId', async (req, res) => {
  try {
    const dealId = parseInt(req.params.dealId);
    const documentId = parseInt(req.params.documentId);
    
    const success = await deleteDocumentBlob(documentId, dealId);
    
    if (!success) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Document deletion error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;