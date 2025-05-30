import { Router } from 'express';
import multer from 'multer';
import { 
  saveDocumentBlob, 
  getDocumentBlob, 
  listDocumentsByDeal, 
  deleteDocumentBlob 
} from '../services/document-blob.service';
import { requireAuth, getCurrentUser } from '../utils/auth';
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
    // Accept all file types for now, can be restricted later
    cb(null, true);
  },
});

// General upload endpoint for documents (used during deal creation)
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

    // Log activity if dealId is provided
    if (targetDealId) {
      await pool.query(
        `INSERT INTO activities (deal_id, event_type, content, created_by, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          targetDealId,
          'document_upload',
          `Document "${originalname}" uploaded`,
          user.id,
          JSON.stringify({ documentId: document.id, documentType: documentType || 'other' })
        ]
      );
    }

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

// Upload document for specific deal
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

    // Log activity
    await pool.query(
      `INSERT INTO activities (deal_id, event_type, content, created_by, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        dealId,
        'document_upload',
        `Document "${originalname}" uploaded`,
        user.id,
        JSON.stringify({ documentId: document.id, documentType: documentType || 'other' })
      ]
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

// Get documents for a specific deal (enforces deal isolation)
router.get('/deal/:dealId', requireAuth, async (req, res) => {
  try {
    const dealId = parseInt(req.params.dealId);
    const documents = await listDocumentsByDeal(dealId);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Download document by ID
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const document = await getDocumentBlob(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.set({
      'Content-Type': document.fileType,
      'Content-Disposition': `inline; filename="${document.fileName}"`,
      'Content-Length': document.fileData.length.toString(),
    });

    res.send(document.fileData);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Delete document
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const user = await getCurrentUser(req);

    if (!user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get document info before deletion for activity logging
    const { rows: docRows } = await pool.query(
      'SELECT file_name, deal_id FROM documents WHERE id = $1',
      [documentId]
    );

    if (docRows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = docRows[0];
    
    await deleteDocumentBlob(documentId);

    // Log activity if document was associated with a deal
    if (document.deal_id) {
      await pool.query(
        `INSERT INTO activities (deal_id, event_type, content, created_by, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          document.deal_id,
          'document_delete',
          `Document "${document.file_name}" deleted`,
          user.id,
          JSON.stringify({ documentId })
        ]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;