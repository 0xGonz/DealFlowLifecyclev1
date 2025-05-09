import { Request, Response, Router } from 'express';
import { StorageFactory } from '../storage-factory';
import { DatabaseStorage } from '../database-storage';
import { pool } from '../db';

export const systemRouter = Router();

// Endpoint to check system health
systemRouter.get('/health', async (req: Request, res: Response) => {
  const currentStorage = StorageFactory.storage;
  
  // Check if using database or memory storage
  const usingDatabase = currentStorage instanceof DatabaseStorage;
  
  // Database connectivity status
  let databaseConnected = false;
  
  try {
    await pool.query('SELECT 1');
    databaseConnected = true;
  } catch (error) {
    console.error('Health check database query failed:', error);
  }
  
  // Return system health information
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    storage: usingDatabase ? 'database' : 'memory',
    databaseConnected,
    environment: process.env.NODE_ENV
  });
});