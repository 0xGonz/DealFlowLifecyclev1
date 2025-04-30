import type { Express } from "express";
import { createServer, type Server } from "http";
import dealsRoutes from './routes/deals';
import fundsRoutes from './routes/funds';
import usersRoutes from './routes/users';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import leaderboardRoutes from './routes/leaderboard';
import activityRoutes from './routes/activity';
import { Router } from "express";
import { insertFundAllocationSchema } from "@shared/schema";
import { storage } from "./storage";
import { z } from "zod";

// Create allocations routes
const allocationsRouter = Router();

// Fund allocations
allocationsRouter.post('/', async (req, res) => {
  try {
    const allocationData = insertFundAllocationSchema.parse(req.body);
    
    // Make sure fund and deal exist
    const fund = await storage.getFund(allocationData.fundId);
    const deal = await storage.getDeal(allocationData.dealId);
    
    if (!fund) {
      return res.status(404).json({ message: 'Fund not found' });
    }
    
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    const newAllocation = await storage.createFundAllocation(allocationData);
    
    // Update deal stage to "closing" if not already closed
    if (deal.stage !== 'closed' && deal.stage !== 'closing') {
      await storage.updateDeal(deal.id, { 
        stage: 'closing',
        createdBy: (req as any).user.id
      });
    }
    
    res.status(201).json(newAllocation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid allocation data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to create fund allocation' });
  }
});

// Get allocations for a fund
allocationsRouter.get('/fund/:fundId', async (req, res) => {
  try {
    const fundId = Number(req.params.fundId);
    const allocations = await storage.getAllocationsByFund(fundId);
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch allocations' });
  }
});

// Get allocations for a deal
allocationsRouter.get('/deal/:dealId', async (req, res) => {
  try {
    const dealId = Number(req.params.dealId);
    const allocations = await storage.getAllocationsByDeal(dealId);
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch allocations' });
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a simple auth middleware
  const authenticate = (req, res, next) => {
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
  app.use('/api/allocations', allocationsRouter);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/activity', activityRoutes);
  
  // Catch-all route for 404s
  app.use('/api/*', (req, res) => {
    res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
  });
  
  // Apply error handling middleware
  app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ 
      message: 'An unexpected error occurred', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}