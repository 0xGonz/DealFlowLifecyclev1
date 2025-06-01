import express from 'express';
import { databaseDocumentStorage } from '../services/database-document-storage.js';
import { requireAuth } from '../utils/auth.js';

const router = express.Router();

// Test endpoint to verify document system health across all documents
router.get('/test-all', requireAuth, async (req, res) => {
  try {
    console.log('🔍 Testing document system health for all documents...');
    
    // Get all documents from database
    const documents = await databaseDocumentStorage.getAllDocuments();
    
    const results = {
      total: documents.length,
      tested: 0,
      working: 0,
      broken: 0,
      details: []
    };

    for (const doc of documents) {
      results.tested++;
      
      const testResult = {
        id: doc.id,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        storageType: 'unknown',
        canServe: false,
        contentSize: 0,
        error: null
      };

      try {
        // Test database storage first
        if (doc.fileData && doc.fileData.length > 0) {
          const fileBuffer = Buffer.from(doc.fileData, 'base64');
          if (fileBuffer.length > 0) {
            testResult.storageType = 'database';
            testResult.canServe = true;
            testResult.contentSize = fileBuffer.length;
            results.working++;
          } else {
            testResult.error = 'Empty database content';
            results.broken++;
          }
        } else if (doc.filePath) {
          // Test filesystem storage
          const fs = await import('fs');
          const path = await import('path');
          const fullPath = path.resolve(doc.filePath);
          
          if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            testResult.storageType = 'filesystem';
            testResult.canServe = true;
            testResult.contentSize = stats.size;
            results.working++;
          } else {
            testResult.storageType = 'filesystem';
            testResult.error = `File not found: ${fullPath}`;
            results.broken++;
          }
        } else {
          testResult.error = 'No data source available';
          results.broken++;
        }
      } catch (error) {
        testResult.error = `Test failed: ${error.message}`;
        results.broken++;
      }

      results.details.push(testResult);
    }

    console.log(`📊 Document system test complete: ${results.working}/${results.total} working`);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: results.total,
        working: results.working,
        broken: results.broken,
        healthScore: Math.round((results.working / results.total) * 100)
      },
      details: results.details
    });

  } catch (error) {
    console.error('❌ Document system test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test document system',
      details: error.message
    });
  }
});

// Test specific document by ID
router.get('/test/:id', requireAuth, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    console.log(`🔍 Testing document ${documentId}...`);
    
    const document = await databaseDocumentStorage.getDocument(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const testResult = {
      documentId,
      fileName: document.fileName,
      fileSize: document.fileSize,
      storageTests: {
        database: { available: false, working: false, size: 0, error: null },
        filesystem: { available: false, working: false, size: 0, error: null }
      },
      recommendation: 'unknown'
    };

    // Test database storage
    if (document.fileData && document.fileData.length > 0) {
      testResult.storageTests.database.available = true;
      try {
        const fileBuffer = Buffer.from(document.fileData, 'base64');
        if (fileBuffer.length > 0) {
          testResult.storageTests.database.working = true;
          testResult.storageTests.database.size = fileBuffer.length;
          testResult.recommendation = 'Database storage working - optimal';
        } else {
          testResult.storageTests.database.error = 'Empty content after conversion';
        }
      } catch (error) {
        testResult.storageTests.database.error = `Conversion failed: ${error.message}`;
      }
    }

    // Test filesystem storage
    if (document.filePath) {
      testResult.storageTests.filesystem.available = true;
      try {
        const fs = await import('fs');
        const path = await import('path');
        const fullPath = path.resolve(document.filePath);
        
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          testResult.storageTests.filesystem.working = true;
          testResult.storageTests.filesystem.size = stats.size;
          
          if (!testResult.storageTests.database.working) {
            testResult.recommendation = 'Filesystem storage working - consider migration to database';
          }
        } else {
          testResult.storageTests.filesystem.error = `File not found: ${fullPath}`;
        }
      } catch (error) {
        testResult.storageTests.filesystem.error = `Filesystem test failed: ${error.message}`;
      }
    }

    // Final recommendation
    if (!testResult.storageTests.database.working && !testResult.storageTests.filesystem.working) {
      testResult.recommendation = 'Document needs to be re-uploaded - no working storage';
    }

    console.log(`📋 Document ${documentId} test complete: ${testResult.recommendation}`);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: testResult
    });

  } catch (error) {
    console.error(`❌ Document ${req.params.id} test failed:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to test document',
      details: error.message
    });
  }
});

export default router;