import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { InsertDocument, insertDocumentSchema } from '@shared/schema';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const router = Router();
const uploadsDir = path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Get all documents for a deal
router.get('/deal/:dealId', async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: 'Invalid deal ID' });
    }
    
    const documents = await storage.getDocumentsByDeal(dealId);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// Get documents by type for a deal
router.get('/deal/:dealId/type/:documentType', async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: 'Invalid deal ID' });
    }
    
    const documents = await storage.getDocumentsByType(dealId, req.params.documentType);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents by type:', error);
    res.status(500).json({ message: 'Failed to fetch documents by type' });
  }
});

// Get a specific document
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Failed to fetch document' });
  }
});

// Download a document
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    const filePath = document.filePath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on disk' });
    }
    
    res.download(filePath, document.fileName);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Failed to download document' });
  }
});

// Upload a document
router.post('/upload', async (req: Request, res: Response) => {
  try {
    // For a real implementation, use a proper file upload middleware like multer
    // This is a simplified version that assumes binary data is sent in the request body
    if (!req.body.file || !req.body.fileName || !req.body.fileType) {
      return res.status(400).json({ message: 'Missing file data, filename, or filetype' });
    }
    
    const { dealId, fileName, fileType, description, documentType, uploadedBy } = req.body;
    
    // Create a unique filename to prevent collisions
    const uniqueFileName = `${randomUUID()}-${fileName}`;
    const filePath = path.join(uploadsDir, uniqueFileName);
    
    // Save the file to disk
    fs.writeFileSync(filePath, req.body.file);
    
    // Get file size
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // Save document metadata to database
    const documentData: InsertDocument = {
      dealId,
      fileName,
      fileType,
      fileSize,
      filePath,
      uploadedBy,
      description: description || null,
      documentType: documentType || 'pitch_deck', // Default to pitch deck
    };
    
    // Validate the document data
    const parseResult = insertDocumentSchema.safeParse(documentData);
    if (!parseResult.success) {
      // Delete the file if validation fails
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ message: 'Invalid document data', errors: parseResult.error.format() });
    }
    
    const newDocument = await storage.createDocument(documentData);
    res.status(201).json(newDocument);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
});

// Delete a document
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Delete the file from disk
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }
    
    // Delete from database
    const result = await storage.deleteDocument(id);
    if (result) {
      res.json({ success: true, message: 'Document deleted successfully' });
    } else {
      res.status(500).json({ message: 'Failed to delete document from database' });
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

export default router;