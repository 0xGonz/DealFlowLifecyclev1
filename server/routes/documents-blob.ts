import { Router, Request, Response } from 'express';
import multer from 'multer';
import { DatabaseStorage } from '../database-storage';
import * as documentBlobService from '../services/document-blob.service';

const router = Router();
const storage = new DatabaseStorage();

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Upload document as blob
router.post('/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { dealId, description, documentType } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!dealId) {
      return res.status(400).json({ error: 'Deal ID is required' });
    }

    console.log(`📤 Blob upload: ${req.file.originalname} for deal ${dealId}`);

    const document = await documentBlobService.saveDocumentBlob(
      parseInt(dealId),
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      req.file.buffer,
      req.session.userId,
      description,
      documentType
    );

    // Create timeline event
    await storage.createTimelineEvent({
      dealId: parseInt(dealId),
      eventType: 'document_upload',
      content: `${req.session.username || 'User'} uploaded document: ${req.file.originalname}`,
      createdBy: req.session.userId,
      metadata: {}
    });

    console.log(`✅ Blob upload complete: ${req.file.originalname}`);

    res.json({
      success: true,
      document,
      id: document.id,
      documentId: document.id,
      fileName: document.fileName,
      fileType: document.fileType,
      message: 'Document uploaded successfully'
    });

  } catch (error) {
    console.error('💥 Blob upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload document',
      details: String(error)
    });
  }
});

// List documents for a deal
router.get('/deal/:dealId', requireAuth, async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    const documents = await documentBlobService.listDocumentsByDeal(dealId);
    res.json(documents);
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

// Download document blob
router.get('/:id/download', requireAuth, async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    console.log(`📥 Blob download request for document ID: ${documentId}`);
    
    const document = await documentBlobService.getDocumentBlob(documentId);
    
    if (!document) {
      console.log(`❌ Document ${documentId} not found`);
      return res.status(404).json({ error: 'Document not found' });
    }

    console.log(`✅ Serving blob: ${document.fileName}`);

    res
      .type(document.fileType)
      .set({
        'Content-Disposition': `inline; filename="${document.fileName}"`,
        'Cache-Control': 'no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      })
      .send(document.fileData);

  } catch (error) {
    console.error(`💥 Blob download error for ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Download failed', 
      details: String(error)
    });
  }
});

// Delete document
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    const deleted = await documentBlobService.deleteDocumentBlob(documentId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;