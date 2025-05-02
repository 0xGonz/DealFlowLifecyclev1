import type { Express, Request, Response, NextFunction } from "express";
import express, { Router } from "express";
import { createServer, type Server } from "http";
import session from 'express-session';
import createMemoryStore from 'memorystore';

// Utils
import { errorHandler as globalErrorHandler, AppError } from './utils/errorHandlers';
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
  
  // Body parser middleware
  app.use(express.json());
  
  // Import route modules dynamically
  const authRouter = await import("./routes/auth").then(m => m.authRouter);
  const usersRouter = await import("./routes/users").then(m => m.usersRouter).catch(() => Router()); // Fallback if not yet created
  
  // Register route modules
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  
  // Other API routes to be implemented later
  // app.use('/api/deals', dealsRoutes);
  // app.use('/api/funds', fundsRoutes);
  // app.use('/api/allocations', allocationsRoutes);
  // app.use('/api/dashboard', dashboardRoutes);
  // app.use('/api/leaderboard', leaderboardRoutes);
  // app.use('/api/activity', activityRoutes);
  // app.use('/api/notifications', notificationsRoutes);
  // app.use('/api/documents', documentsRoutes);
  
  // Catch-all route for 404s
  app.use('/api/*', notFoundHandler);
  
  // Apply centralized error handling middleware
  app.use(globalErrorHandler);

  const httpServer = createServer(app);
  return httpServer;
}