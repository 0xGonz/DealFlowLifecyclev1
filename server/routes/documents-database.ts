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

// Download document - handles both database and filesystem storage
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);

    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    // First try to get document from database
    const document = await databaseDocumentStorage.getDocument(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if document has file data in database
    if (document.fileData) {
      console.log(`📥 Serving document ${documentId} from database: ${document.fileName}`);
      console.log(`📊 Database record shows fileSize: ${document.fileSize} bytes`);
      console.log(`📄 Document ${documentId} has fileData field with length: ${document.fileData.length} characters`);
      console.log(`🔍 First 50 chars of fileData: ${document.fileData.substring(0, 50)}...`);
      
      // Convert base64 back to buffer (direct conversion, no hex handling needed)
      let fileBuffer;
      try {
        fileBuffer = Buffer.from(document.fileData, 'base64');
        console.log(`✅ Document ${documentId} converted to buffer: ${fileBuffer.length} bytes`);
        
        // Validate buffer has content
        if (fileBuffer.length === 0) {
          console.error(`❌ Document ${documentId} converted to empty buffer`);
          console.error(`❌ Original fileData was: "${document.fileData}"`);
          return res.status(410).json({ error: 'Document content is empty' });
        }
      } catch (error) {
        console.error(`❌ Error converting document ${documentId} from base64:`, error);
        console.error(`❌ FileData that failed conversion: ${document.fileData.substring(0, 100)}...`);
        return res.status(500).json({ error: 'Failed to process document content' });
      }
      
      // Set appropriate headers for inline viewing (especially PDFs)
      res.setHeader('Content-Type', document.fileType);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.removeHeader('ETag');
      
      // Use inline for PDFs to enable browser viewing, attachment for others
      const disposition = document.fileType === 'application/pdf' ? 'inline' : 'attachment';
      res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(document.fileName)}"`);
      res.setHeader('Content-Length', fileBuffer.length.toString());

      return res.send(fileBuffer);
    } 
    
    // Fallback to filesystem for legacy documents
    if (document.filePath) {
      console.log(`📂 Serving legacy document ${documentId} from filesystem: ${document.filePath}`);
      
      const fs = await import('fs');
      const path = await import('path');
      
      const fullPath = path.resolve(document.filePath);
      
      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        console.error(`❌ Legacy file not found: ${fullPath}`);
        return res.status(410).json({ error: 'Document file no longer available' });
      }

      // Set appropriate headers
      res.setHeader('Content-Type', document.fileType);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.removeHeader('ETag');
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(fullPath);
      fileStream.on('error', (err) => {
        console.error(`❌ Error reading legacy file ${fullPath}:`, err);
        if (!res.headersSent) {
          res.status(410).json({ error: 'Document file no longer available' });
        }
      });
      
      return fileStream.pipe(res);
    }

    // No file data available
    console.error(`❌ Document ${documentId} has no file data in database or filesystem`);
    return res.status(410).json({ error: 'Document content not available' });

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

    // First try to get document from database
    const document = await databaseDocumentStorage.getDocument(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if document has file data in database
    if (document.fileData) {
      console.log(`📖 Serving document ${documentId} for viewing from database: ${document.fileName} (${document.fileSize} bytes)`);
      console.log(`📄 Document ${documentId} has fileData of length: ${document.fileData.length}`);
      
      // Convert base64 back to buffer (direct conversion, no hex handling needed)
      let fileBuffer;
      try {
        fileBuffer = Buffer.from(document.fileData, 'base64');
        console.log(`✅ Document ${documentId} converted to buffer: ${fileBuffer.length} bytes`);
        
        // Validate buffer has content
        if (fileBuffer.length === 0) {
          console.error(`❌ Document ${documentId} converted to empty buffer`);
          return res.status(410).json({ error: 'Document content is empty' });
        }
      } catch (error) {
        console.error(`❌ Error converting document ${documentId} from base64:`, error);
        return res.status(500).json({ error: 'Failed to process document content' });
      }
      
      // Set appropriate headers for inline viewing
      res.setHeader('Content-Type', document.fileType);
      res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.removeHeader('ETag');

      return res.send(fileBuffer);
    } 
    
    // Fallback to filesystem for legacy documents
    if (document.filePath) {
      console.log(`📂 Serving legacy document ${documentId} for viewing from filesystem: ${document.filePath}`);
      
      const fs = await import('fs');
      const path = await import('path');
      
      const fullPath = path.resolve(document.filePath);
      
      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        console.error(`❌ Legacy file not found: ${fullPath}`);
        return res.status(410).json({ error: 'Document file no longer available' });
      }

      // Set appropriate headers for inline viewing
      res.setHeader('Content-Type', document.fileType);
      res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.removeHeader('ETag');
      
      // Stream the file
      const fileStream = fs.createReadStream(fullPath);
      fileStream.on('error', (err) => {
        console.error(`❌ Error reading legacy file ${fullPath}:`, err);
        if (!res.headersSent) {
          res.status(410).json({ error: 'Document file no longer available' });
        }
      });
      
      return fileStream.pipe(res);
    }

    // No file data available
    console.error(`❌ Document ${documentId} has no file data in database or filesystem`);
    return res.status(410).json({ error: 'Document content not available' });

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
      hasFileData: !!doc.fileData, // Indicate if file has data in database
      // Add download/view URLs
      downloadUrl: `/api/documents/${doc.id}/download`,
      viewUrl: `/api/documents/${doc.id}/view`
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