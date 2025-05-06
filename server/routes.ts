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

// Utils
import { errorHandler, notFoundHandler, AppError } from './utils/errorHandlers';
import { requireAuth, getCurrentUser } from './utils/auth';
import { isDatabaseHealthy } from './db';
import { StorageFactory } from './storage-factory';

/**
 * Register and configure all application routes with proper middleware
 * This function sets up the complete API structure in a modular, maintainable way
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Database health check middleware for API monitoring
  app.use('/api/system/health', (req: Request, res: Response) => {
    const dbHealthy = isDatabaseHealthy();
    const storageType = StorageFactory.getActiveStorageType();
    
    const healthStatus = {
      database: {
        connected: dbHealthy,
        using_db_directly: dbHealthy && storageType === 'database',
        current_storage: storageType
      },
      server: {
        status: 'healthy',
        time: new Date().toISOString()
      }
    };
    
    // Always return 200 if server is running, even if using memory fallback
    // This allows monitoring systems to detect when the server itself is down
    // while still reporting accurate database status
    res.status(200).json(healthStatus);
  });
  
  // Middleware to attach user object to request
  app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.session.userId) {
        console.log(`Session userId found: ${req.session.userId}, attempting to get user`);
        const user = await getCurrentUser(req);
        if (user) {
          console.log(`User found: ${user.username}, role: ${user.role}`);
        } else {
          console.log(`No user found for session userId: ${req.session.userId}`);
        }
        (req as any).user = user;
      } else {
        console.log('No session userId found in middleware');
      }
      next();
    } catch (error) {
      console.error('Error attaching user to request:', error);
      next(error);
    }
  });
  
  // Authentication middleware for all API routes except auth endpoints
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // Skip auth check for auth endpoints, health checks, and OPTIONS requests
    if (
      req.path.startsWith('/auth') || 
      req.path.startsWith('/system/health') || 
      req.method === 'OPTIONS'
    ) {
      return next();
    }
    
    // Require authentication for all other API routes
    requireAuth(req, res, next);
  });
  
  // Register route modules
  app.use('/api/deals', dealsRoutes);
  app.use('/api/funds', fundsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/allocations', allocationsRoutes);
  app.use('/api/fund-allocations', allocationsRoutes); // Add this alias for client compatibility
  app.use('/api/capital-calls', capitalCallsRoutes);
  app.use('/api/closing-schedules', closingSchedulesRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/documents', documentsRoutes);
  
  // Catch-all route for 404s
  app.use('/api/*', notFoundHandler);
  
  // Apply centralized error handling middleware
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}