import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";

// Route imports - minimal working configuration
import documentsRoutes from './routes/documents';
// AI analysis routes removed during cleanup

// Utils
import { errorHandler, notFoundHandler, AppError } from './utils/errorHandlers';
import { requireAuth, getCurrentUser } from './utils/auth';
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
  
  // Middleware to attach user object to request - enhanced with error handling
  app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.session?.userId) {
        const user = await getCurrentUser(req);
        (req as any).user = user;
      }
      next();
    } catch (error) {
      console.error('Error in user middleware:', error);
      // Continue even with error to avoid breaking the request
      next();
    }
  });
  
  // Authentication middleware for all API routes except auth endpoints and system endpoints
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // Skip auth check for auth/system endpoints and OPTIONS requests
    if (req.path.startsWith('/auth') || 
        req.path.startsWith('/system') || 
        req.method === 'OPTIONS') {
      return next();
    }
    
    // Require authentication for all other API routes
    requireAuth(req, res, next);
  });
  
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