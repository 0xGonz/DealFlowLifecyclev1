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

    const { dealId, documentType = 'other', description } = req.body;
    
    if (!dealId) {
      return res.status(400).json({ error: 'Deal ID is required' });
    }

    // Validate file type
    const validation = await documentStorage.validateFileType(req.file.originalname, req.file.mimetype);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.reason });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
      return res.status(400).json({ error: 'File size exceeds 10MB limit' });
    }

    // Create deal-specific directory
    const dealDir = `storage/documents/deal-${dealId}`;
    await documentStorage.ensureDirectoryExists(dealDir);

    // Generate unique filename to prevent conflicts
    const timestamp = Date.now();
    const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}-${sanitizedName}`;
    const filePath = `${dealDir}/${uniqueFileName}`;

    // Save file to disk
    await fs.writeFile(filePath, req.file.buffer);

    // Use unified document storage to create document record
    const document = await documentStorage.createDocument({
      dealId: parseInt(dealId),
      fileName: req.file.originalname, // Keep original name for display
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      documentType,
      filePath: `storage/documents/deal-${dealId}/${uniqueFileName}`,
      uploadedBy: 1, // TODO: Get from authenticated user session
      description: description || null
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