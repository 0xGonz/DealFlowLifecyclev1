import { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import dealsRoutes from './deals';
import fundsRoutes from './funds';
import usersRoutes from './users';
import authRoutes from './auth';
import allocationsRoutes from './allocations';
import activityRoutes from './activity';
import dashboardRoutes from './dashboard';
import leaderboardRoutes from './leaderboard';
import notificationsRoutes from './notifications';
import documentsRoutes from './documents';

// Create a simple auth middleware
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // For MVP, we're not implementing real auth
  // In a real app, this would check JWT tokens, session data, etc.
  // Just simulate a logged-in user
  (req as any).user = { id: 2, role: 'partner' }; // John Doe as default user
  next();
};

// Error handling middleware
const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'An unexpected error occurred', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
};

export function registerRoutes(app: Express): Server {
  // Apply authentication middleware to all API routes
  app.use('/api', authenticate);
  
  // Register route modules
  app.use('/api/deals', dealsRoutes);
  app.use('/api/funds', fundsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/allocations', allocationsRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/documents', documentsRoutes);
  
  // Catch-all route for 404s
  app.use('/api/*', (req, res) => {
    res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
  });
  
  // Apply error handling middleware
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}