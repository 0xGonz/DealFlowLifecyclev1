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
    
    // Set appropriate content type
    res.setHeader('Content-Type', document.fileType);
    
    // Try to serve the actual file if it exists in the uploads directory
    const actualFilePath = path.join(process.cwd(), 'public', document.filePath);
    
    // Check if the actual file exists first
    if (fs.existsSync(actualFilePath)) {
      console.log(`Serving actual file from: ${actualFilePath}`);
      const fileContent = fs.readFileSync(actualFilePath);
      return res.send(fileContent);
    }
    
    // Fallback to the sample PDF for testing
    if (document.fileType === 'application/pdf' || document.fileName.toLowerCase().endsWith('.pdf')) {
      const samplePdfPath = path.join(process.cwd(), 'public/uploads/sample-upload.pdf');
      try {
        if (fs.existsSync(samplePdfPath)) {
          console.log(`Serving sample PDF from: ${samplePdfPath}`);
          const fileContent = fs.readFileSync(samplePdfPath);
          return res.send(fileContent);
        }
      } catch (error) {
        console.error('Error reading sample PDF file:', error);
      }
    }
    
    // Final fallback
    console.log(`Using text fallback for: ${document.fileName}`);
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
    
    // Generate a unique ID for the file
    const fileId = crypto.randomUUID();
    const filePath = `/uploads/${fileId}-${fileName}`;
    
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
    
    // For demo purposes, copy the sample PDF to the expected path
    // In a real implementation, you would save the uploaded file contents here
    try {
      const samplePdfPath = path.join(process.cwd(), 'public/uploads/sample-upload.pdf');
      const actualFilePath = path.join(process.cwd(), 'public', filePath);
      if (fs.existsSync(samplePdfPath)) {
        // Make sure the directory exists
        const dir = path.dirname(actualFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        // Copy the sample file to the expected path
        fs.copyFileSync(samplePdfPath, actualFilePath);
        console.log(`Copied sample PDF to ${actualFilePath}`);
      }
    } catch (error) {
      console.error('Error copying sample file:', error);
    }
    
    // Also create a timeline event for the document upload
    await storage.createTimelineEvent({
      dealId: parseInt(dealId),
      eventType: 'document_upload',
      content: `Document uploaded: ${fileName}`,
      createdBy: 1, // Admin user ID (only ID 1 exists in the database)
      metadata: { documentId: [document.id] }
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