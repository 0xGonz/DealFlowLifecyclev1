import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from 'express-session';
import createMemoryStore from 'memorystore';

// Route imports
import dealsRoutes from './routes/deals';
import fundsRoutes from './routes/funds';
import { usersRouter as usersRoutes } from './routes/users';
import { authRouter as authRoutes } from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import leaderboardRoutes from './routes/leaderboard';
import activityRoutes from './routes/activity';
import notificationsRoutes from './routes/notifications';
import documentsRoutes from './routes/documents';
import allocationsRoutes from './routes/allocations';

// Utils
import { globalErrorHandler as errorHandler, AppError } from './utils/errorHandlers';
import { requireAuth } from './utils/auth';

// Custom 404 handler
const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware with memorystore
  const MemoryStore = createMemoryStore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'investment-tracker-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    },
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    })
  }));
  
  // Uncomment to require authentication for all API routes
  // app.use('/api/*', requireAuth);
  
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
  app.use('/api/*', notFoundHandler);
  
  // Apply centralized error handling middleware
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}