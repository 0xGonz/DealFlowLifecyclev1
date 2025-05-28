import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { DatabaseStorage } from '../database-storage';

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

// Download document endpoint - FIXED VERSION
router.get('/:id/download', requireAuth, async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.id);
    console.log(`📥 Download request for document ID: ${documentId}`);
    
    const document = await storage.getDocument(documentId);
    if (!document) {
      console.log(`❌ Document ${documentId} not found in database`);
      return res.status(404).json({ message: 'Document not found' });
    }

    console.log(`📄 Found document: ${document.fileName}`);
    console.log(`📍 Original file path: ${document.filePath}`);
    
    // Try multiple possible file locations
    const possiblePaths = [
      path.join(process.cwd(), document.filePath), // Relative to project root
      path.join(process.cwd(), 'public', 'uploads', document.fileName), // Standard uploads with fileName
      path.join(process.cwd(), 'uploads', document.fileName), // Alternative uploads with fileName
      path.join(process.cwd(), 'public', document.filePath), // Public + relative path
      path.join(process.cwd(), 'data', 'uploads', document.fileName) // Data uploads
    ].filter(Boolean); // Remove any undefined paths
    
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