import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";

// Route imports - minimal working configuration
import documentsRoutes from './routes/documents';
// AI analysis routes removed during cleanup

// Utils
import { errorHandler, notFoundHandler, AppError } from './utils/errorHandlers';
import { pool } from './db';

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Debug middleware to log session consistency issues
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/closing-schedules') {
      console.log(`Session debug before closing-schedules: userId=${req.session?.userId || 'none'}, sessionID=${req.sessionID?.substring(0, 8)}...`);
      
      // Print session data for debugging
      if (req.session) {
        console.log('Session object:', {
          id: req.sessionID,
          cookie: req.session.cookie,
          userId: req.session.userId,
          username: req.session.username,
          role: req.session.role
        });
        
        if (!req.session.userId) {
          console.log('No userId in session, user is not authenticated');
        }
      }
    }
    next();
  });
  
  // User middleware removed during cleanup - minimal working configuration
  
  // Authentication middleware removed during cleanup - minimal working configuration
  
  // Register route modules - minimal working configuration
  app.use('/api/documents', documentsRoutes); // PostgreSQL blob storage with deal isolation
  // V1 and AI analysis routes removed during cleanup
  
  // Catch-all route for 404s
  app.use('/api/*', notFoundHandler);
  
  // Apply centralized error handling middleware
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}