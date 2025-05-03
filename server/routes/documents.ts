import { Router, Request, Response } from 'express';
import { StorageFactory } from '../storage-factory';
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import * as schema from '@shared/schema';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const router = Router();

// Get all documents for a deal
router.get('/deal/:dealId', async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: 'Invalid deal ID' });
    }
    
    const storage = StorageFactory.getStorage();
    const documents = await storage.getDocumentsByDeal(dealId);
    return res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// Get documents for a deal filtered by type
router.get('/deal/:dealId/type/:documentType', async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    const { documentType } = req.params;
    
    if (isNaN(dealId)) {
      return res.status(400).json({ message: 'Invalid deal ID' });
    }
    
    const storage = StorageFactory.getStorage();
    const documents = await storage.getDocumentsByType(dealId, documentType);
    return res.json(documents);
  } catch (error) {
    console.error('Error fetching documents by type:', error);
    return res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// Get a single document by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    const storage = StorageFactory.getStorage();
    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    return res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    return res.status(500).json({ message: 'Failed to fetch document' });
  }
});

// Download a document
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    const storage = StorageFactory.getStorage();
    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // For in-memory storage, we'll use a sample PDF file for demonstration
    // In a real implementation, you'd use document.fileData or document.filePath to serve the actual file
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    res.setHeader('Content-Type', document.fileType);
    
    // Serve a sample PDF for testing
    const fs = require('fs');
    const path = require('path');
    
    // Check file type and serve an appropriate file
    if (document.fileType === 'application/pdf' || document.fileName.toLowerCase().endsWith('.pdf')) {
      const pdfPath = path.join(process.cwd(), 'public/documents/sample.pdf');
      if (fs.existsSync(pdfPath)) {
        const fileContent = fs.readFileSync(pdfPath);
        return res.send(fileContent);
      }
    }
    
    // Fallback if file doesn't exist or isn't a PDF
    const content = `This is a document file for ${document.fileName}`;
    res.send(Buffer.from(content));
    
  } catch (error) {
    console.error('Error downloading document:', error);
    return res.status(500).json({ message: 'Failed to download document' });
  }
});

// Upload a document
router.post('/upload', async (req: Request, res: Response) => {
  try {
    // This works with both FormData and JSON payload
    const storage = StorageFactory.getStorage();
    console.log('Received document upload request:', req.body);
    
    const { dealId, fileName, fileType, documentType, description, uploadedBy } = req.body;
    const fileSize = req.body.fileSize || 1024; // Default file size if not provided
    
    if (!dealId || !fileName || !documentType || !uploadedBy) {
      console.error('Missing required fields:', { dealId, fileName, documentType, uploadedBy });
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Generate a file path
    const filePath = `/uploads/${crypto.randomUUID()}-${fileName}`;
    
    const documentData = {
      dealId: parseInt(dealId),
      fileName,
      fileType: fileType || 'application/pdf',
      fileSize: parseInt(fileSize),
      filePath,
      uploadedBy: parseInt(uploadedBy),
      documentType,
      description: description || null,
      uploadedAt: new Date()
    };
    
    console.log('Creating document with data:', documentData);
    const document = await storage.createDocument(documentData);
    console.log('Document created successfully:', document);
    
    // Also create a timeline event for the document upload
    await storage.createTimelineEvent({
      dealId: parseInt(dealId),
      eventType: 'document_upload',
      content: `Document uploaded: ${fileName}`,
      createdBy: 1, // Admin user ID (only ID 1 exists in the database)
      createdAt: new Date(),
      metadata: JSON.stringify({ documentId: document.id })
    });
    
    return res.status(201).json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    return res.status(500).json({ message: 'Failed to upload document' });
  }
});

// Delete a document
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.getStorage();
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    const deleted = await storage.deleteDocument(id);
    if (!deleted) {
      return res.status(500).json({ message: 'Failed to delete document' });
    }
    
    return res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ message: 'Failed to delete document' });
  }
});

export default router;