import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";

// Route imports
import dealsRoutes from './routes/deals';
import fundsRoutes from './routes/funds';
import usersRoutes from './routes/users';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import leaderboardRoutes from './routes/leaderboard';
import activityRoutes from './routes/activity';
import notificationsRoutes from './routes/notifications';
import documentsRoutes from './routes/documents';
import allocationsRoutes from './routes/allocations';
import capitalCallsRoutes from './routes/capital-calls';
import closingSchedulesRoutes from './routes/closing-schedules';
import { systemRouter } from './routes/system';

// Utils
import { errorHandler, notFoundHandler, AppError } from './utils/errorHandlers';
import { requireAuth, getCurrentUser } from './utils/auth';

export async function registerRoutes(app: Express): Promise<Server | null> {
  try {
    // Add simple health check to verify server is running
    app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // Middleware to attach user object to request
    app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (req.session && req.session.userId) {
          const user = await getCurrentUser(req);
          (req as any).user = user;
        }
        next();
      } catch (error) {
        console.error('Error attaching user to request:', error);
        next(); // Continue even if user attachment fails
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
    
    // Basic error-resistant route registration
    const registerRoute = (path: string, router: any) => {
      try {
        app.use(path, router);
      } catch (error) {
        console.error(`Error registering route ${path}:`, error);
      }
    };
    
    // Register route modules with error handling
    registerRoute('/api/deals', dealsRoutes);
    registerRoute('/api/funds', fundsRoutes);
    registerRoute('/api/users', usersRoutes);
    registerRoute('/api/auth', authRoutes);
    registerRoute('/api/allocations', allocationsRoutes);
    registerRoute('/api/fund-allocations', allocationsRoutes); // Add this alias for client compatibility
    registerRoute('/api/capital-calls', capitalCallsRoutes);
    registerRoute('/api/closing-schedules', closingSchedulesRoutes);
    registerRoute('/api/dashboard', dashboardRoutes);
    registerRoute('/api/leaderboard', leaderboardRoutes);
    registerRoute('/api/activity', activityRoutes);
    registerRoute('/api/notifications', notificationsRoutes);
    registerRoute('/api/documents', documentsRoutes);
    registerRoute('/api/system', systemRouter);
    
    // Catch-all route for 404s
    app.use('/api/*', notFoundHandler);
    
    // Apply centralized error handling middleware
    app.use(errorHandler);
    
    return null; // No need to create a server here since we're doing it in index.ts
  } catch (error) {
    console.error('Error registering routes:', error);
    return null; // Return null to indicate failure
  }
}