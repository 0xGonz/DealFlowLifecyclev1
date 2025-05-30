import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { documentManager } from '../services/document-manager.service.js';
import { requireAuth } from '../utils/auth.js';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, Excel, and text files are allowed.'));
    }
  }
});

// Upload document
router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { dealId, documentType = 'other' } = req.body;
    
    if (!dealId) {
      return res.status(400).json({ error: 'Deal ID is required' });
    }

    const document = await documentManager.uploadDocument(
      parseInt(dealId),
      req.file.originalname,
      req.file.mimetype,
      req.file.buffer,
      documentType
    );

    res.json({
      id: document.id,
      fileName: document.fileName,
      fileType: document.fileType,
      fileSize: document.fileSize,
      dealId: document.dealId,
      documentType: document.documentType,
      uploadedAt: document.uploadedAt
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get documents for a deal
router.get('/deal/:dealId', requireAuth, async (req, res, next) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      return res.status(400).json({ error: 'Invalid deal ID' });
    }

    const documents = await documentManager.getDocumentsByDeal(dealId);
    
    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      dealId: doc.dealId,
      documentType: doc.documentType,
      uploadedAt: doc.uploadedAt
    }));

    res.json(formattedDocuments);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Download document
router.get('/:id/download', requireAuth, async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const document = await documentManager.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const fileBuffer = await documentManager.downloadDocument(documentId);
    if (!fileBuffer) {
      return res.status(404).json({ error: 'Document file not found' });
    }

    res.set({
      'Content-Type': document.fileType,
      'Content-Length': fileBuffer.length.toString(),
      'Content-Disposition': `inline; filename="${document.fileName}"`
    });

    res.send(fileBuffer);
  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Get document metadata
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const document = await documentManager.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      id: document.id,
      fileName: document.fileName,
      fileType: document.fileType,
      fileSize: document.fileSize,
      dealId: document.dealId,
      documentType: document.documentType,
      uploadedAt: document.uploadedAt
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Delete document
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const success = await documentManager.deleteDocument(documentId);
    if (!success) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Document deletion error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Validate document integrity
router.get('/:id/validate', requireAuth, async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const validation = await documentManager.validateDocument(documentId);
    res.json(validation);
  } catch (error) {
    console.error('Document validation error:', error);
    res.status(500).json({ error: 'Failed to validate document' });
  }
});

// Admin routes

// Get storage statistics
router.get('/admin/stats', requireAuth, async (req, res, next) => {
  try {
    const stats = await documentManager.getStorageStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    res.status(500).json({ error: 'Failed to fetch storage statistics' });
  }
});

// Clean up orphaned files
router.post('/admin/cleanup', requireAuth, async (req, res, next) => {
  try {
    const deletedFiles = await documentManager.cleanupOrphanedFiles();
    res.json({
      message: 'Cleanup completed',
      deletedFiles,
      count: deletedFiles.length
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup orphaned files' });
  }
});

export default router;