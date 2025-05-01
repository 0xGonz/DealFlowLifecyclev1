import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a simple auth middleware
  const authenticate = (req: Request, res: Response, next: NextFunction) => {
    // For MVP, we're not implementing real auth
    // In a real app, this would check JWT tokens, session data, etc.
    // Just simulate a logged-in user
    (req as any).user = { id: 2, role: 'partner' }; // John Doe as default user
    next();
  };

  // Apply authentication middleware to all API routes
  app.use('/api', authenticate);
  
  // Register route modules
  app.use('/api/deals', dealsRoutes);
  app.use('/api/funds', fundsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/allocations', allocationsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/documents', documentsRoutes);
  
  // Catch-all route for 404s
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
  });
  
  // Apply error handling middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ 
      message: 'An unexpected error occurred', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}