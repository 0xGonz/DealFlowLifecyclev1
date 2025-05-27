import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Request, Response, Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { StorageFactory } from '../storage';
import { createInsertSchema } from 'drizzle-zod';
import { documents } from '../../shared/schema';
import { z } from 'zod';
import { fileResolver } from '../services/FileResolver';

const router = Router();

// Configure multer for file uploads
const UPLOAD_PATH = path.resolve(process.cwd(), 'public/uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
  console.log('Created upload directory:', UPLOAD_PATH);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dealId = req.body.dealId;
    if (dealId) {
      const dealDir = path.join(UPLOAD_PATH, `deal-${dealId}`);
      if (!fs.existsSync(dealDir)) {
        fs.mkdirSync(dealDir, { recursive: true });
      }
      cb(null, dealDir);
    } else {
      cb(null, UPLOAD_PATH);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
}

// Upload endpoint
router.post('/upload', requireAuth, upload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { dealId, description, documentType } = req.body;

    if (!dealId) {
      return res.status(400).json({ message: 'Deal ID is required' });
    }

    const storage = StorageFactory.getStorage();
    
    // Store relative path in database
    const relativePath = path.relative(path.resolve(process.cwd(), 'public'), req.file.path);
    
    const documentData = {
      dealId: parseInt(dealId),
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: relativePath,
      uploadedBy: (req as any).user.id,
      description: description || null,
      documentType: documentType || 'document'
    };

    const document = await storage.createDocument(documentData);
    console.log('Document uploaded successfully:', document);
    
    res.json({ 
      message: 'Document uploaded successfully',
      document 
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      message: 'Failed to upload document',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get documents for a deal
router.get('/deal/:dealId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const storage = StorageFactory.getStorage();
    const documents = await storage.getDealDocuments(parseInt(dealId));
    res.json(documents);
  } catch (error) {
    console.error('Error fetching deal documents:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// Download/view document endpoint - MODULAR ARCHITECTURE
router.get('/:id/download', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    console.log(`🔍 Download request for document ID: ${id}`);
    
    const storage = StorageFactory.getStorage();
    const document = await storage.getDocument(parseInt(id));
    if (!document) {
      console.log(`❌ Document ${id} not found in database`);
      return res.status(404).json({ message: 'Document not found' });
    }
    
    console.log(`✅ Found document ${id}: ${document.fileName} (Deal: ${document.dealId})`);
    console.log(`📁 Database filePath: ${document.filePath}`);
    
    // Use the modular file resolution system
    const resolutionResult = await fileResolver.resolveFile(document);
    
    console.log(`🔍 Resolution strategy: ${resolutionResult.strategy || 'none'}`);
    console.log(`📂 Attempted ${resolutionResult.allAttempts.length} locations`);
    
    if (resolutionResult.path) {
      console.log(`✅ File resolved: ${resolutionResult.path}`);
      
      // Set appropriate headers
      res.setHeader('Content-Type', document.fileType);
      res.setHeader('Cache-Control', 'no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      if (document.fileType === 'application/pdf' || document.fileName.toLowerCase().endsWith('.pdf')) {
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.fileName)}"`);
      } else {
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.fileName)}"`);
      }
      
      // Stream the file
      const fileStream = fs.createReadStream(resolutionResult.path);
      fileStream.pipe(res);
      
      fileStream.on('error', (err) => {
        console.error('Error streaming document:', err);
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Stream error',
            message: 'Error accessing the document file'
          });
        }
      });
      
      return;
    }
    
    // File not found with modular resolution
    console.log(`❌ File resolution failed for: ${document.fileName}`);
    
    return res.status(404).json({ 
      error: 'File not found',
      message: `Document "${document.fileName}" is not available`,
      details: 'The file is missing from storage. Database record is preserved.',
      fileName: document.fileName,
      documentId: document.id,
      strategy: 'modular-resolution'
    });

  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Internal server error while accessing document'
    });
  }
});

// Delete document
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const storage = StorageFactory.getStorage();
    
    const document = await storage.getDocument(parseInt(id));
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Try to delete the physical file using modular resolution
    const resolutionResult = await fileResolver.resolveFile(document);
    if (resolutionResult.path) {
      try {
        fs.unlinkSync(resolutionResult.path);
        console.log(`✅ Physical file deleted: ${resolutionResult.path}`);
      } catch (fileError) {
        console.warn(`⚠️ Could not delete physical file: ${fileError}`);
      }
    }

    // Delete from database
    await storage.deleteDocument(parseInt(id));
    console.log(`✅ Document ${id} deleted from database`);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

// Health check endpoint for file resolution system
router.get('/system/health', requireAuth, async (req: Request, res: Response) => {
  try {
    const health = await fileResolver.validateStorageHealth();
    res.json({
      fileResolver: 'operational',
      ...health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking file system health:', error);
    res.status(500).json({ 
      error: 'Health check failed',
      message: 'Could not validate file system health'
    });
  }
});

export default router;