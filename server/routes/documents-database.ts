import express from 'express';
import multer from 'multer';
import { databaseDocumentStorage } from '../services/database-document-storage.js';
import { requireAuth } from '../utils/auth.js';

const router = express.Router();

// Configure multer for memory storage (no temp files needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'image/jpeg',
      'image/png'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, XLSX, XLS, CSV, and images are allowed.'), false);
    }
  }
});

// Upload document with database storage
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { dealId, documentType = 'other', description } = req.body;

    if (!dealId) {
      return res.status(400).json({ error: 'Deal ID is required' });
    }

    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate file
    const validation = await databaseDocumentStorage.validateFile(
      req.file.originalname,
      req.file.mimetype,
      req.file.size
    );

    if (!validation.valid) {
      return res.status(400).json({ error: validation.reason });
    }

    console.log(`Processing document upload: ${req.file.originalname} for deal ${dealId}`);

    // Store document in database
    const newDocument = await databaseDocumentStorage.createDocument({
      dealId: parseInt(dealId),
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      fileBuffer: req.file.buffer,
      uploadedBy: userId,
      description,
      documentType
    });

    console.log(`✓ Document uploaded successfully: ID ${newDocument.id}`);
    res.json({
      id: newDocument.id,
      fileName: newDocument.fileName,
      fileType: newDocument.fileType,
      fileSize: newDocument.fileSize,
      documentType: newDocument.documentType,
      description: newDocument.description,
      uploadedAt: newDocument.uploadedAt,
      message: 'Document uploaded and stored in database successfully'
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Internal server error during upload' });
  }
});

// Download document from database
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);

    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const result = await databaseDocumentStorage.downloadDocument(documentId);

    if (!result) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.buffer.length.toString());

    // Send the file data
    res.send(result.buffer);

  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Internal server error during download' });
  }
});

// View document in browser (for PDFs and images)
router.get('/:id/view', requireAuth, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);

    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const result = await databaseDocumentStorage.downloadDocument(documentId);

    if (!result) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Set appropriate headers for inline viewing
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.buffer.length.toString());
    
    // Add caching headers for better performance
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('ETag', `"${documentId}-${Date.now()}"`);

    // Send the file data
    res.send(result.buffer);

  } catch (error) {
    console.error('Error viewing document:', error);
    res.status(500).json({ error: 'Internal server error during view' });
  }
});

// Get documents for a deal
router.get('/deal/:dealId', requireAuth, async (req, res) => {
  try {
    const dealId = parseInt(req.params.dealId);

    if (isNaN(dealId)) {
      return res.status(400).json({ error: 'Invalid deal ID' });
    }

    const documents = await databaseDocumentStorage.getDocumentsByDeal(dealId);
    
    // Format documents for frontend (exclude file data from list)
    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      documentType: doc.documentType,
      description: doc.description,
      uploadedAt: doc.uploadedAt,
      uploadedBy: doc.uploadedBy,
      // Add download/view URLs
      downloadUrl: `/api/documents-db/${doc.id}/download`,
      viewUrl: `/api/documents-db/${doc.id}/view`
    }));

    res.json(formattedDocuments);

  } catch (error) {
    console.error('Error getting documents for deal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update document metadata
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);

    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const { fileName, description, documentType } = req.body;

    const updatedDocument = await databaseDocumentStorage.updateDocument(documentId, {
      fileName,
      description,
      documentType
    });

    if (!updatedDocument) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      id: updatedDocument.id,
      fileName: updatedDocument.fileName,
      fileType: updatedDocument.fileType,
      fileSize: updatedDocument.fileSize,
      documentType: updatedDocument.documentType,
      description: updatedDocument.description,
      uploadedAt: updatedDocument.uploadedAt,
      message: 'Document updated successfully'
    });

  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Internal server error during update' });
  }
});

// Delete document
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);

    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const result = await databaseDocumentStorage.deleteDocument(documentId);

    if (!result.success) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Internal server error during deletion' });
  }
});

export default router;