import { Request, Response, Router } from 'express';
import { StorageFactory } from '../storage-factory';
import { DatabaseStorage } from '../database-storage';
import { HybridStorage } from '../hybrid-storage';
import { MemStorage } from '../storage';
import { pool } from '../db';
import { metricsHandler } from '../middleware/metrics';
import { MetricsService, LoggingService } from '../services';

const metricsService = MetricsService.getInstance();
const logger = LoggingService.getInstance();

export const systemRouter = Router();

// Endpoint to test database connectivity explicitly
systemRouter.post('/database/test-connection', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, connected: true, message: 'Database connection successful' });
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(503).json({ 
      success: false, 
      connected: false, 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint to force synchronization of pending operations
systemRouter.post('/database/sync-pending', async (req: Request, res: Response) => {
  const currentStorage = StorageFactory.storage;
  
  // Check if using hybrid storage
  if (currentStorage instanceof HybridStorage) {
    try {
      const hybridStorage = currentStorage as HybridStorage;
      
      // Call the public syncPendingWrites method
      await hybridStorage.syncPendingWrites();
      res.json({ 
        success: true, 
        message: 'Pending operations synchronized successfully',
        pending: Array.from(hybridStorage.pendingWrites?.keys() || [])
      });
    } catch (error) {
      console.error('Error while synchronizing pending operations:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to synchronize pending operations',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    res.status(400).json({ 
      success: false, 
      message: 'Not using hybrid storage - no pending operations to synchronize'
    });
  }
});

// Endpoint to simulate database failure for testing (admin only)
systemRouter.post('/database/simulate-failure', (req: Request, res: Response) => {
  // Check if user is authenticated and has admin role
  if (!req.session?.userId || req.session?.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized - admin access required'
    });
  }
  
  const currentStorage = StorageFactory.storage;
  
  // Check if using hybrid storage
  if (currentStorage instanceof HybridStorage) {
    try {
      const hybridStorage = currentStorage as HybridStorage;
      
      // Force memory mode for testing
      hybridStorage.usingDatabase = false;
      hybridStorage.recoveryInProgress = true;
      
      res.json({ 
        success: true, 
        message: 'Database failure simulation activated',
        mode: 'memory',
        recoveryInProgress: hybridStorage.recoveryInProgress
      });
    } catch (error) {
      console.error('Error while simulating database failure:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to simulate database failure',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    res.status(400).json({ 
      success: false, 
      message: 'Not using hybrid storage - cannot simulate database failure'
    });
  }
});

// Endpoint to restore normal operation after testing (admin only)
systemRouter.post('/database/restore-normal', async (req: Request, res: Response) => {
  // Check if user is authenticated and has admin role
  if (!req.session?.userId || req.session?.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized - admin access required'
    });
  }
  
  const currentStorage = StorageFactory.storage;
  
  // Check if using hybrid storage
  if (currentStorage instanceof HybridStorage) {
    try {
      const hybridStorage = currentStorage as HybridStorage;
      
      // First check if database is actually available
      try {
        await pool.query('SELECT 1');
        
        // Restore normal operation
        hybridStorage.usingDatabase = true;
        hybridStorage.recoveryInProgress = false;
        
        // Sync any pending operations
        await hybridStorage.syncPendingWrites();
        
        res.json({ 
          success: true, 
          message: 'Normal database operation restored',
          mode: 'database',
          pendingWrites: Array.from(hybridStorage.pendingWrites.keys())
        });
      } catch (dbError) {
        res.status(503).json({ 
          success: false, 
          message: 'Cannot restore normal operation - database is not available',
          error: dbError instanceof Error ? dbError.message : String(dbError)
        });
      }
    } catch (error) {
      console.error('Error while restoring normal operation:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to restore normal operation',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    res.status(400).json({ 
      success: false, 
      message: 'Not using hybrid storage - cannot restore normal operation'
    });
  }
});

// Endpoint to check system health
systemRouter.get('/health', async (req: Request, res: Response) => {
  const currentStorage = StorageFactory.storage;
  
  // Determine storage type
  let storageType = 'unknown';
  let usingHybrid = false;
  let pendingWrites = 0;
  let hybridInfo = null;
  
  if (currentStorage instanceof DatabaseStorage) {
    storageType = 'database';
  } else if (currentStorage instanceof MemStorage) {
    storageType = 'memory';
  } else if (currentStorage instanceof HybridStorage) {
    storageType = 'hybrid';
    usingHybrid = true;
    
    // Get hybrid storage specific info if available
    if (typeof (currentStorage as any).usingDatabase === 'boolean') {
      const hybridStorage = currentStorage as any;
      const pendingWriteTypes = hybridStorage.pendingWrites ? 
        Array.from(hybridStorage.pendingWrites.keys()) : [];
      
      // Count total pending operations manually to avoid TypeScript issues
      let totalPending = 0;
      if (hybridStorage.pendingWrites) {
        for (const type of pendingWriteTypes) {
          const operations = hybridStorage.pendingWrites.get(type);
          if (Array.isArray(operations)) {
            totalPending += operations.length;
          }
        }
      }
      pendingWrites = totalPending;
      
      hybridInfo = {
        usingDatabase: hybridStorage.usingDatabase,
        pendingWriteTypes,
        pendingWrites,
        recoveryInProgress: hybridStorage.recoveryInProgress
      };
    }
  }
  
  // Database connectivity status
  let databaseConnected = false;
  
  try {
    await pool.query('SELECT 1');
    databaseConnected = true;
  } catch (error) {
    logger.error('Health check database query failed:', error as Error);
  }
  
  // Get application metrics
  const metrics = metricsService.getAllMetrics();
  const httpRequestsTotal = metrics.get('http_requests_total')?.value || 0;
  const httpErrorsTotal = metrics.get('http_requests_error_total')?.value || 0;
  const appUptime = metrics.get('app_uptime_seconds')?.value || 0;
  
  // Return system health information
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    storage: storageType,
    databaseConnected,
    environment: process.env.NODE_ENV,
    metrics: {
      uptime: appUptime,
      requests: httpRequestsTotal,
      errors: httpErrorsTotal,
      errorRate: httpRequestsTotal ? (httpErrorsTotal / httpRequestsTotal) * 100 : 0
    },
    hybridStatus: usingHybrid ? {
      pendingWrites,
      hybridInfo
    } : null
  });
});

// Endpoint to expose metrics in Prometheus format
systemRouter.get('/metrics', metricsHandler);