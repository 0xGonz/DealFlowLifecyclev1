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

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Middleware to attach user object to request
  app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
    if (req.session.userId) {
      const user = await getCurrentUser(req);
      (req as any).user = user;
    }
    next();
  });
  
  // Authentication middleware for all API routes except auth endpoints
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // Skip auth check for auth endpoints and OPTIONS requests
    if (req.path.startsWith('/auth') || req.method === 'OPTIONS') {
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