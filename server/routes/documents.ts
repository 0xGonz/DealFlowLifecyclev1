import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Request, Response, Router } from 'express';
import { requireAuth } from '../utils/auth';
import { StorageFactory } from '../storage-factory';
import { createInsertSchema } from 'drizzle-zod';
import { documents } from '../../shared/schema';
import { z } from 'zod';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create a safe filename
    const timestamp = Date.now();
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${cleanName}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Sanitize filename helper
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
}

// Upload document endpoint
router.post('/upload', requireAuth, upload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { dealId, description } = req.body;
    
    if (!dealId) {
      return res.status(400).json({ message: 'Deal ID is required' });
    }

    const documentData = {
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      dealId: parseInt(dealId),
      description: description || '',
      uploadedBy: (req as any).user.id,
      uploadedAt: new Date(),
    };

    const storage = StorageFactory.getStorage();
    const document = await storage.createDocument(documentData);
    
    console.log(`✅ Document uploaded: ${req.file.originalname} (ID: ${document.id})`);
    res.json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
});

// Get documents for a deal
router.get('/deal/:dealId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const storage = StorageFactory.getStorage();
    const documents = await storage.getDocumentsByDeal(parseInt(dealId));
    res.json(documents);
  } catch (error) {
    console.error('Error fetching deal documents:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// Download/view document endpoint
router.get('/:id/download', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }

    const storage = StorageFactory.getStorage();
    const document = await storage.getDocument(parseInt(id));
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    console.log(`✅ Found document ${id}: ${document.fileName} (Deal: ${document.dealId})`);
    console.log(`📁 Database filePath: ${document.filePath}`);
    
    // Enhanced file path resolution with multiple fallback strategies
    const pathsToTry = [
      document.filePath, // Original path
      document.filePath.startsWith('/') ? document.filePath.substring(1) : document.filePath, // Remove leading slash
      document.filePath.startsWith('uploads/') ? document.filePath : `uploads/${document.filePath}`, // Add uploads/ prefix
      document.filePath.startsWith('/uploads/') ? document.filePath.substring(1) : document.filePath, // Clean /uploads/ to uploads/
    ];
    
    // Remove duplicates while preserving order
    const uniquePaths = [...new Set(pathsToTry)];
    
    let resolvedPath = null;
    for (const testPath of uniquePaths) {
      if (fs.existsSync(testPath)) {
        resolvedPath = testPath;
        break;
      }
    }
    
    if (resolvedPath) {
      console.log(`✅ File resolved: ${resolvedPath}`);
      
      // Set appropriate headers
      res.setHeader('Content-Type', document.fileType);
      res.setHeader('Cache-Control', 'no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Send the file
      res.sendFile(path.resolve(resolvedPath));
    } else {
      console.log(`❌ File not found after trying ${uniquePaths.length} paths:`);
      uniquePaths.forEach((tryPath, index) => {
        console.log(`   ${index + 1}. ${tryPath} (${fs.existsSync(tryPath) ? 'EXISTS' : 'NOT FOUND'})`);
      });
      
      res.status(404).json({ 
        message: 'We apologize, but this document file could not be located. The file may have been moved or deleted.',
        userMessage: 'Document temporarily unavailable',
        debug: {
          fileName: document.fileName,
          originalPath: document.filePath,
          attemptedPaths: uniquePaths,
          uploadDate: document.uploadedAt
        }
      });
    }
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Failed to download document' });
  }
});

// Delete document endpoint
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }

    const storage = StorageFactory.getStorage();
    const document = await storage.getDocument(parseInt(id));
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Handle both old and new file path formats for deletion
    let filePath = document.filePath;
    
    // Try the exact path first
    if (!fs.existsSync(filePath)) {
      // If it starts with /uploads/, try without the leading slash
      if (filePath.startsWith('/uploads/')) {
        filePath = filePath.substring(1); // Remove leading slash
      }
      // If it doesn't start with uploads/, try adding it
      else if (!filePath.startsWith('uploads/')) {
        filePath = `uploads/${filePath}`;
      }
    }

    // Delete the file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted file: ${filePath}`);
    } else {
      console.log(`⚠️ File not found for deletion: ${filePath}`);
    }

    // Delete from database
    await storage.deleteDocument(parseInt(id));
    
    console.log(`✅ Document deleted: ${document.fileName} (ID: ${id})`);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

// Health check endpoint
router.get('/system/health', requireAuth, async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.getStorage();
    
    // Test database connection by trying to fetch a document
    await storage.getDocument(1);
    
    // Check uploads directory
    const uploadsDir = 'uploads';
    const uploadsExists = fs.existsSync(uploadsDir);
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
        uploadsDirectory: uploadsExists ? 'exists' : 'missing'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;