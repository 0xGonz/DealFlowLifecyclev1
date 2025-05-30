import { Router, Request, Response } from 'express';
import { DocumentService } from '../services/document.service';
import { DocumentUploadService } from '../services/document-upload.service';
import { FileManagerService } from '../services/file-manager.service';

const router = Router();
const documentService = new DocumentService();

/**
 * Modular Document Routes
 * Complete systematic document management with proper error handling
 */

// Get all documents for a deal
router.get('/deal/:dealId', async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      return res.status(400).json({ error: 'Invalid deal ID' });
    }

    const documentsWithStatus = await documentService.getDocumentsByDeal(dealId);
    
    const response = documentsWithStatus.map(({ document, exists, resolvedPath }) => ({
      id: document.id,
      fileName: document.fileName,
      fileType: document.fileType,
      fileSize: document.fileSize,
      documentType: document.documentType,
      description: document.description,
      uploadedAt: document.uploadedAt,
      uploadedBy: document.uploadedBy,
      version: document.version,
      exists,
      resolvedPath: exists ? resolvedPath : null
    }));

    res.json(response);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get specific document metadata
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const { document, resolvedPath, exists } = await documentService.getDocumentById(documentId);
    
    res.json({
      ...document,
      exists,
      resolvedPath: exists ? resolvedPath : null
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Document not found' });
  }
});

// Download/view document file
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const { document, resolvedPath, exists } = await documentService.getDocumentById(documentId);
    
    if (!exists || !resolvedPath) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The document file is missing from the server. Please re-upload the document.',
        documentId,
        storedPath: document.filePath,
        fileName: document.fileName
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', document.fileType);
    res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
    
    // Create and pipe read stream
    const stream = documentService.createDocumentStream(resolvedPath);
    if (!stream) {
      return res.status(500).json({ error: 'Failed to create file stream' });
    }

    stream.pipe(res);
    
    stream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream file' });
      }
    });

  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Upload new document
router.post('/upload', DocumentUploadService.getMulterConfig().single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { dealId, description, documentType } = req.body;
    const userId = req.session?.userId;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate request
    const validation = DocumentUploadService.validateUploadRequest(req.body);
    if (!validation.isValid) {
      DocumentUploadService.cleanupFailedUpload(file);
      return res.status(400).json({ error: validation.error });
    }

    // Process upload
    const newDocument = await DocumentUploadService.processUpload(
      file,
      parseInt(dealId),
      userId,
      {
        description,
        documentType,
        username: req.session?.username
      }
    );

    res.status(201).json({
      id: newDocument.id,
      fileName: newDocument.fileName,
      fileType: newDocument.fileType,
      fileSize: newDocument.fileSize,
      documentType: newDocument.documentType,
      description: newDocument.description,
      uploadedAt: newDocument.uploadedAt,
      message: 'Document uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Cleanup file on error
    if (req.file) {
      DocumentUploadService.cleanupFailedUpload(req.file);
    }
    
    res.status(500).json({ 
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update document metadata
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const { description, documentType } = req.body;
    const updates: any = {};
    
    if (description !== undefined) updates.description = description;
    if (documentType !== undefined) updates.documentType = documentType;

    const updatedDocument = await documentService.updateDocument(documentId, updates);
    
    res.json({
      ...updatedDocument,
      message: 'Document updated successfully'
    });

  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const deleted = await documentService.deleteDocument(documentId);
    
    if (deleted) {
      res.json({ message: 'Document deleted successfully' });
    } else {
      res.status(404).json({ error: 'Document not found' });
    }

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Get document diagnostics (for troubleshooting)
router.get('/:id/diagnostics', async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const { document, diagnostics } = await documentService.getDocumentDiagnostics(documentId);
    
    res.json({
      document: {
        id: document.id,
        fileName: document.fileName,
        filePath: document.filePath,
        fileType: document.fileType,
        fileSize: document.fileSize
      },
      diagnostics
    });

  } catch (error) {
    console.error('Error getting diagnostics:', error);
    res.status(500).json({ error: 'Failed to get diagnostics' });
  }
});

export default router;