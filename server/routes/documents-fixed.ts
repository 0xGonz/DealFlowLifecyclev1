import { Router } from 'express';
import multer from 'multer';
import { UnifiedDocumentStorage } from '../services/unified-document-storage.js';
import { requireAuth } from '../utils/auth.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const router = Router();
const documentStorage = new UnifiedDocumentStorage();

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/documents/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { dealId, documentType = 'other' } = req.body;
    
    if (!dealId) {
      return res.status(400).json({ error: 'Deal ID is required' });
    }

    // Create deal-specific directory
    const dealDir = `storage/documents/deal-${dealId}`;
    await fs.mkdir(dealDir, { recursive: true });

    // Save file to disk
    const filePath = `${dealDir}/${req.file.originalname}`;
    await fs.writeFile(filePath, req.file.buffer);

    // Use unified document storage to create document
    const document = await documentStorage.createDocument({
      dealId: parseInt(dealId),
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      documentType,
      filePath: `storage/documents/deal-${dealId}/${req.file.originalname}`,
      uploadedBy: 1
    });

    res.json({
      success: true,
      document,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// GET /api/documents/deal/:dealId - Get documents for a deal
router.get('/deal/:dealId', async (req, res) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      return res.status(400).json({ error: 'Invalid deal ID' });
    }

    const documents = await documentStorage.getDocumentsByDeal(dealId);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// GET /api/documents/:documentId/download - Download a document
router.get('/:documentId/download', async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const result = await documentStorage.downloadDocument(documentId);
    if (!result) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.buffer);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

export default router;