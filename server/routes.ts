import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from './auth';

// Route imports
import dealsRoutes from './routes/deals';
import fundsRoutes from './routes/funds';
import usersRoutes from './routes/users';
import dashboardRoutes from './routes/dashboard';
import leaderboardRoutes from './routes/leaderboard';
import activityRoutes from './routes/activity';
import notificationsRoutes from './routes/notifications';
import documentsRoutes from './routes/documents';
import allocationsRoutes from './routes/allocations';

// Utils
import { errorHandler, notFoundHandler, AppError } from './utils/errorHandlers';
import { requireAuth } from './utils/auth';

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Setup authentication with our new implementation
  setupAuth(app);
  
  // Register route modules - require authentication for most routes
  app.use('/api/deals', requireAuth, dealsRoutes);
  app.use('/api/funds', requireAuth, fundsRoutes);
  app.use('/api/users', requireAuth, usersRoutes);
  app.use('/api/allocations', requireAuth, allocationsRoutes);
  app.use('/api/dashboard', requireAuth, dashboardRoutes);
  app.use('/api/leaderboard', requireAuth, leaderboardRoutes);
  app.use('/api/activity', requireAuth, activityRoutes);
  app.use('/api/notifications', requireAuth, notificationsRoutes);
  app.use('/api/documents', requireAuth, documentsRoutes);
  
  // Debugging middleware to log all routes
  app.use((req, res, next) => {
    console.log(`Route requested: ${req.method} ${req.path}`);
    next();
  });
  
  // Catch-all route for 404s
  app.use('/api/*', notFoundHandler);
  
  // Apply centralized error handling middleware
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}