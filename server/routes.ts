import type { Express, Request, Response, NextFunction } from "express";
import express, { Router } from "express";
import { createServer, type Server } from "http";
import session from 'express-session';
import createMemoryStore from 'memorystore';

// Utils
import { globalErrorHandler, AppError } from './utils/errorHandlers';
import { requireAuth } from './utils/auth';

// Custom 404 handler
const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware is now in index.ts
  // This helps us to deserialize user first, then attach to request
  
  // Body parser middleware
  app.use(express.json());
  
  // Import route modules dynamically
  const authRouter = await import("./routes/auth").then(m => m.authRouter);
  const usersRouter = await import("./routes/users").then(m => m.usersRouter).catch(() => Router()); // Fallback if not yet created
  const dealsRouter = await import("./routes/deals").then(m => m.dealsRouter).catch(() => Router());
  const dashboardRouter = await import("./routes/dashboard").then(m => m.dashboardRouter).catch(() => Router());
  const notificationsRouter = await import("./routes/notifications").then(m => m.notificationsRouter).catch(() => Router());
  
  // Register route modules
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/deals', dealsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/notifications', notificationsRouter);
  
  // Create stub endpoints for other routes that might be requested by the frontend
  const stubRouter = Router();
  stubRouter.get('/*', (req, res) => res.json([]));
  stubRouter.post('/*', (req, res) => res.json({}));
  
  app.use('/api/funds', stubRouter);
  app.use('/api/allocations', stubRouter);
  app.use('/api/leaderboard', stubRouter);
  app.use('/api/activity', stubRouter);
  app.use('/api/documents', stubRouter);
  
  // Catch-all route for 404s
  app.use('/api/*', notFoundHandler);
  
  // Apply centralized error handling middleware
  app.use(globalErrorHandler);

  const httpServer = createServer(app);
  return httpServer;
}