import express from 'express';
import { Pool } from 'pg';
import multer from 'multer';
import { DealDocumentIsolationService } from '../services/deal-document-isolation.service.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

export function createIsolatedDocumentsRoutes(pool: Pool) {
  const isolationService = new DealDocumentIsolationService(pool);

  // Initialize audit tables
  isolationService.initializeAuditTables().catch(console.error);

  // GET /api/documents/deal/:dealId - Get documents for specific deal only
  router.get('/deal/:dealId', async (req, res) => {
    try {
      const dealId = parseInt(req.params.dealId);
      
      if (isNaN(dealId)) {
        return res.status(400).json({ error: 'Invalid deal ID' });
      }

      const documents = await isolationService.getDocumentsForDeal(dealId);
      
      console.log(`Retrieved ${documents.length} documents for deal ${dealId}`);
      res.json(documents);
      
    } catch (error) {
      console.error('Error getting deal documents:', error);
      res.status(500).json({ error: 'Failed to retrieve documents' });
    }
  });

  // POST /api/documents/deal/:dealId/upload - Upload document to specific deal
  router.post('/deal/:dealId/upload', upload.single('file'), async (req, res) => {
    try {
      const dealId = parseInt(req.params.dealId);
      
      if (isNaN(dealId)) {
        return res.status(400).json({ error: 'Invalid deal ID' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const documentId = await isolationService.uploadDocumentToDeal(
        dealId,
        req.file.originalname,
        req.file.buffer,
        req.file.mimetype
      );

      res.status(201).json({ 
        id: documentId, 
        message: 'Document uploaded successfully',
        dealId: dealId
      });
      
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to upload document' 
      });
    }
  });

  // GET /api/documents/deal/:dealId/:documentId/download - Download document with deal verification
  router.get('/deal/:dealId/:documentId/download', async (req, res) => {
    try {
      const dealId = parseInt(req.params.dealId);
      const documentId = parseInt(req.params.documentId);
      
      if (isNaN(dealId) || isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid deal or document ID' });
      }

      const document = await isolationService.downloadDocumentFromDeal(documentId, dealId);
      
      res.set({
        'Content-Type': document.fileType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${document.fileName}"`
      });
      
      res.send(document.fileData);
      
    } catch (error) {
      console.error('Error downloading document:', error);
      if (error.message.includes('Cross-deal document access denied')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(404).json({ error: 'Document not found in specified deal' });
      }
    }
  });

  // DELETE /api/documents/deal/:dealId/:documentId - Delete document from specific deal
  router.delete('/deal/:dealId/:documentId', async (req, res) => {
    try {
      const dealId = parseInt(req.params.dealId);
      const documentId = parseInt(req.params.documentId);
      
      if (isNaN(dealId) || isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid deal or document ID' });
      }

      await isolationService.deleteDocumentFromDeal(documentId, dealId);
      
      res.json({ message: 'Document deleted successfully' });
      
    } catch (error) {
      console.error('Error deleting document:', error);
      if (error.message.includes('Cross-deal document access denied')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(404).json({ error: 'Document not found in specified deal' });
      }
    }
  });

  // POST /api/documents/move - Move document between deals
  router.post('/move', async (req, res) => {
    try {
      const { documentId, newDealId, reason } = req.body;
      
      if (!documentId || !newDealId || !reason) {
        return res.status(400).json({ 
          error: 'documentId, newDealId, and reason are required' 
        });
      }

      await isolationService.moveDocumentToDeal(documentId, newDealId, reason);
      
      res.json({ 
        message: 'Document moved successfully',
        documentId,
        newDealId,
        reason
      });
      
    } catch (error) {
      console.error('Error moving document:', error);
      res.status(500).json({ error: error.message || 'Failed to move document' });
    }
  });

  // GET /api/documents/audit - Audit all deal-document integrity
  router.get('/audit', async (req, res) => {
    try {
      const auditResults = await isolationService.auditDealDocumentIntegrity();
      
      const summary = {
        totalDeals: auditResults.length,
        dealsWithIssues: auditResults.filter(r => r.issues.length > 0).length,
        totalDocuments: auditResults.reduce((sum, r) => sum + r.documentCount, 0),
        results: auditResults
      };
      
      res.json(summary);
      
    } catch (error) {
      console.error('Error during audit:', error);
      res.status(500).json({ error: 'Failed to audit document integrity' });
    }
  });

  // GET /api/documents/deal/:dealId/:documentId/validate - Validate document belongs to deal
  router.get('/deal/:dealId/:documentId/validate', async (req, res) => {
    try {
      const dealId = parseInt(req.params.dealId);
      const documentId = parseInt(req.params.documentId);
      
      if (isNaN(dealId) || isNaN(documentId)) {
        return res.status(400).json({ error: 'Invalid deal or document ID' });
      }

      const isValid = await isolationService.validateDocumentDealAssociation(documentId, dealId);
      
      res.json({ 
        valid: isValid,
        documentId,
        dealId,
        message: isValid ? 'Document belongs to deal' : 'Document does not belong to deal'
      });
      
    } catch (error) {
      console.error('Error validating document:', error);
      res.status(500).json({ error: error.message || 'Validation failed' });
    }
  });

  return router;
}