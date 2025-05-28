import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { DatabaseStorage } from '../database-storage';
import { DocumentService } from '../modules/documents/service';

const router = Router();
const storage = new DatabaseStorage();

// Simple auth check middleware
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Get documents for a specific deal
router.get('/deal/:dealId', requireAuth, async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    console.log(`📁 Fetching documents for deal ${dealId}`);
    
    const documents = await storage.getDocumentsByDeal(dealId);
    console.log(`📋 Found ${documents.length} documents for deal ${dealId}`);
    
    res.json(documents);
  } catch (error) {
    console.error('Error fetching deal documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get specific document metadata
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    const document = await storage.getDocument(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Download document endpoint - COMPREHENSIVE FIX
router.get('/:id/download', requireAuth, async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    console.log(`📥 Download request for document ID: ${documentId}`);
    
    // Get document with comprehensive logging
    let document;
    try {
      document = await storage.getDocument(documentId);
      console.log(`🔍 Database query completed for document ${documentId}`);
      console.log(`📄 Raw document result:`, JSON.stringify(document, null, 2));
    } catch (dbError) {
      console.error(`💥 Database error for document ${documentId}:`, dbError);
      return res.status(500).json({ message: 'Database error', error: String(dbError) });
    }
    
    if (!document) {
      console.log(`❌ Document ${documentId} not found in database`);
      return res.status(404).json({ message: 'Document not found' });
    }

    // Extract filename and file path with multiple fallbacks
    const fileName = document.fileName || document.file_name || document.name;
    const filePath = document.filePath || document.file_path || document.path;
    
    console.log(`📄 Extracted fileName: ${fileName}`);
    console.log(`📍 Extracted filePath: ${filePath}`);
    
    if (!fileName && !filePath) {
      console.error(`❌ Document ${documentId} has no valid file name or path!`);
      return res.status(500).json({ message: 'Document missing file information' });
    }
    
    // Build potential file paths
    const possiblePaths = [];
    
    if (filePath) {
      possiblePaths.push(
        path.join(process.cwd(), filePath),
        path.join(process.cwd(), 'public', filePath),
        path.join(process.cwd(), 'uploads', filePath)
      );
    }
    
    if (fileName) {
      possiblePaths.push(
        path.join(process.cwd(), 'uploads', fileName),
        path.join(process.cwd(), 'public', 'uploads', fileName),
        path.join(process.cwd(), 'data', 'uploads', fileName)
      );
    }
    
    let resolvedFilePath = null;
    
    for (const testPath of possiblePaths) {
      console.log(`🔍 Checking path: ${testPath}`);
      if (fs.existsSync(testPath)) {
        resolvedFilePath = testPath;
        console.log(`✅ Found file at: ${testPath}`);
        break;
      }
    }
    
    if (!resolvedFilePath) {
      console.error(`💥 File not found in any location for document ${documentId}`);
      console.error(`Searched paths:`, possiblePaths);
      return res.status(404).json({ 
        message: 'File not found on disk',
        originalPath: document.filePath,
        searchedPaths: possiblePaths
      });
    }

    // Set appropriate headers
    const fileExtension = path.extname(document.fileName).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.txt': 'text/plain'
    };

    const mimeType = mimeTypes[fileExtension] || 'application/octet-stream';
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
    
    // Set file size header
    try {
      const stats = fs.statSync(resolvedFilePath);
      res.setHeader('Content-Length', stats.size);
    } catch (err) {
      console.warn('Could not get file stats:', err);
    }
    
    console.log(`📁 Serving file: ${document.fileName} from ${resolvedFilePath}`);
    
    // Create and pipe file stream
    const fileStream = fs.createReadStream(resolvedFilePath);
    
    fileStream.on('error', (err) => {
      console.error('Error streaming document:', err);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Stream error',
          message: 'Error accessing the document file'
        });
      }
    });
    
    fileStream.pipe(res);
  } catch (error) {
    const err = error as Error;
    console.error(`💥 ERROR in download route for document ${req.params.id}:`, err);
    return res.status(500).json({ 
      message: 'Failed to download document', 
      error: err.message 
    });
  }
});

export default router;