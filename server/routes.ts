import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertDealSchema, 
  insertTimelineEventSchema, 
  insertDealStarSchema,
  insertMiniMemoSchema,
  insertFundSchema,
  insertFundAllocationSchema,
  insertDealAssignmentSchema,
  DealStageLabels
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a simple auth middleware
  const authenticate = (req: Request, res: Response, next: Function) => {
    // For MVP, we're not implementing real auth
    // In a real app, this would check JWT tokens, session data, etc.
    // Just simulate a logged-in user
    (req as any).user = { id: 2, role: 'partner' }; // John Doe as default user
    next();
  };

  // User routes
  app.get('/api/users', authenticate, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        initials: user.initials,
        email: user.email,
        role: user.role,
        avatarColor: user.avatarColor
      })));
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get('/api/users/:id', authenticate, async (req, res) => {
    try {
      const user = await storage.getUser(Number(req.params.id));
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't send password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Auth routes (simplified for MVP)
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // In a real app, you'd create a JWT token here
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        user: userWithoutPassword,
        token: 'fake-jwt-token'
      });
    } catch (error) {
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Deal routes
  app.get('/api/deals', authenticate, async (req, res) => {
    try {
      let deals;
      
      if (req.query.stage) {
        deals = await storage.getDealsByStage(req.query.stage as string);
      } else {
        deals = await storage.getDeals();
      }
      
      // For each deal, get the assignments and stars
      const dealsWithExtras = await Promise.all(deals.map(async (deal) => {
        const assignments = await storage.getDealAssignments(deal.id);
        const stars = await storage.getDealStars(deal.id);
        const miniMemos = await storage.getMiniMemosByDeal(deal.id);
        
        // Calculate score from mini memos
        let score = 0;
        if (miniMemos.length > 0) {
          score = Math.floor(miniMemos.reduce((sum, memo) => sum + memo.score, 0) / miniMemos.length);
        }
        
        return {
          ...deal,
          stageLabel: DealStageLabels[deal.stage],
          assignedUsers: assignments.map(a => a.userId),
          starCount: stars.length,
          score
        };
      }));
      
      res.json(dealsWithExtras);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch deals' });
    }
  });

  app.get('/api/deals/:id', authenticate, async (req, res) => {
    try {
      const deal = await storage.getDeal(Number(req.params.id));
      
      if (!deal) {
        return res.status(404).json({ message: 'Deal not found' });
      }
      
      const assignments = await storage.getDealAssignments(deal.id);
      const stars = await storage.getDealStars(deal.id);
      const timelineEvents = await storage.getTimelineEventsByDeal(deal.id);
      const miniMemos = await storage.getMiniMemosByDeal(deal.id);
      const allocations = await storage.getAllocationsByDeal(deal.id);
      
      // Get assigned users with details
      const assignedUserIds = assignments.map(a => a.userId);
      const users = await storage.getUsers();
      const assignedUsers = users.filter(user => assignedUserIds.includes(user.id))
        .map(user => ({
          id: user.id,
          fullName: user.fullName,
          initials: user.initials,
          avatarColor: user.avatarColor,
          role: user.role
        }));
      
      // Calculate score from mini memos
      let score = 0;
      if (miniMemos.length > 0) {
        score = Math.floor(miniMemos.reduce((sum, memo) => sum + memo.score, 0) / miniMemos.length);
      }
      
      res.json({
        ...deal,
        stageLabel: DealStageLabels[deal.stage],
        assignedUsers,
        starCount: stars.length,
        timelineEvents,
        miniMemos,
        allocations,
        score
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch deal' });
    }
  });

  app.post('/api/deals', authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      const dealData = insertDealSchema.parse({
        ...req.body,
        createdBy: user.id
      });
      
      const newDeal = await storage.createDeal(dealData);
      
      // Automatically assign creator to the deal
      await storage.assignUserToDeal({
        dealId: newDeal.id,
        userId: user.id
      });
      
      res.status(201).json(newDeal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid deal data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create deal' });
    }
  });

  app.patch('/api/deals/:id', authenticate, async (req, res) => {
    try {
      const dealId = Number(req.params.id);
      const user = (req as any).user;
      
      // Make sure deal exists
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ message: 'Deal not found' });
      }
      
      // Validate the partial update data
      const updateSchema = insertDealSchema.partial();
      const dealUpdate = updateSchema.parse({
        ...req.body,
        // If stage is updated, record who changed it
        ...(req.body.stage && { createdBy: user.id })
      });
      
      const updatedDeal = await storage.updateDeal(dealId, dealUpdate);
      res.json(updatedDeal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid deal data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update deal' });
    }
  });

  // Timeline events
  app.get('/api/deals/:dealId/timeline', authenticate, async (req, res) => {
    try {
      const dealId = Number(req.params.dealId);
      
      // Make sure deal exists
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ message: 'Deal not found' });
      }
      
      const events = await storage.getTimelineEventsByDeal(dealId);
      
      // Get user info for each event
      const userIds = [...new Set(events.map(e => e.createdBy))];
      const users = await Promise.all(userIds.map(id => storage.getUser(id)));
      
      const eventsWithUserInfo = events.map(event => {
        const user = users.find(u => u?.id === event.createdBy);
        return {
          ...event,
          user: user ? {
            id: user.id,
            fullName: user.fullName,
            initials: user.initials,
            avatarColor: user.avatarColor
          } : null
        };
      });
      
      res.json(eventsWithUserInfo);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch timeline events' });
    }
  });

  app.post('/api/deals/:dealId/timeline', authenticate, async (req, res) => {
    try {
      const dealId = Number(req.params.dealId);
      const user = (req as any).user;
      
      // Make sure deal exists
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ message: 'Deal not found' });
      }
      
      const eventData = insertTimelineEventSchema.parse({
        ...req.body,
        dealId,
        createdBy: user.id
      });
      
      const newEvent = await storage.createTimelineEvent(eventData);
      
      // Return with user info
      const userInfo = await storage.getUser(user.id);
      res.status(201).json({
        ...newEvent,
        user: userInfo ? {
          id: userInfo.id,
          fullName: userInfo.fullName,
          initials: userInfo.initials,
          avatarColor: userInfo.avatarColor
        } : null
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid event data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create timeline event' });
    }
  });

  // Deal stars
  app.post('/api/deals/:dealId/star', authenticate, async (req, res) => {
    try {
      const dealId = Number(req.params.dealId);
      const user = (req as any).user;
      
      // Make sure deal exists
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ message: 'Deal not found' });
      }
      
      const starData = insertDealStarSchema.parse({
        dealId,
        userId: user.id
      });
      
      const star = await storage.starDeal(starData);
      res.status(201).json(star);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid star data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to star deal' });
    }
  });

  app.delete('/api/deals/:dealId/star', authenticate, async (req, res) => {
    try {
      const dealId = Number(req.params.dealId);
      const user = (req as any).user;
      
      const success = await storage.unstarDeal(dealId, user.id);
      if (!success) {
        return res.status(404).json({ message: 'Star not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to unstar deal' });
    }
  });

  // Mini memos
  app.get('/api/deals/:dealId/memos', authenticate, async (req, res) => {
    try {
      const dealId = Number(req.params.dealId);
      
      // Make sure deal exists
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ message: 'Deal not found' });
      }
      
      const memos = await storage.getMiniMemosByDeal(dealId);
      
      // Get user info for each memo
      const userIds = [...new Set(memos.map(m => m.userId))];
      const users = await Promise.all(userIds.map(id => storage.getUser(id)));
      
      const memosWithUserInfo = memos.map(memo => {
        const user = users.find(u => u?.id === memo.userId);
        return {
          ...memo,
          user: user ? {
            id: user.id,
            fullName: user.fullName,
            initials: user.initials,
            avatarColor: user.avatarColor,
            role: user.role
          } : null
        };
      });
      
      res.json(memosWithUserInfo);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch mini memos' });
    }
  });

  app.post('/api/deals/:dealId/memos', authenticate, async (req, res) => {
    try {
      const dealId = Number(req.params.dealId);
      const user = (req as any).user;
      
      // Make sure deal exists
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ message: 'Deal not found' });
      }
      
      const memoData = insertMiniMemoSchema.parse({
        ...req.body,
        dealId,
        userId: user.id
      });
      
      const newMemo = await storage.createMiniMemo(memoData);
      
      // Return with user info
      const userInfo = await storage.getUser(user.id);
      res.status(201).json({
        ...newMemo,
        user: userInfo ? {
          id: userInfo.id,
          fullName: userInfo.fullName,
          initials: userInfo.initials,
          avatarColor: userInfo.avatarColor,
          role: userInfo.role
        } : null
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid memo data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create mini memo' });
    }
  });

  // Funds
  app.get('/api/funds', authenticate, async (req, res) => {
    try {
      const funds = await storage.getFunds();
      res.json(funds);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch funds' });
    }
  });

  app.get('/api/funds/:id', authenticate, async (req, res) => {
    try {
      const fund = await storage.getFund(Number(req.params.id));
      
      if (!fund) {
        return res.status(404).json({ message: 'Fund not found' });
      }
      
      const allocations = await storage.getAllocationsByFund(fund.id);
      
      // Get deal info for each allocation
      const dealIds = [...new Set(allocations.map(a => a.dealId))];
      const deals = await Promise.all(dealIds.map(id => storage.getDeal(id)));
      
      const allocationsWithDealInfo = allocations.map(allocation => {
        const deal = deals.find(d => d?.id === allocation.dealId);
        return {
          ...allocation,
          deal: deal ? {
            id: deal.id,
            name: deal.name,
            stage: deal.stage,
            stageLabel: DealStageLabels[deal.stage]
          } : null
        };
      });
      
      res.json({
        ...fund,
        allocations: allocationsWithDealInfo
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch fund' });
    }
  });

  app.post('/api/funds', authenticate, async (req, res) => {
    try {
      const fundData = insertFundSchema.parse(req.body);
      const newFund = await storage.createFund(fundData);
      res.status(201).json(newFund);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid fund data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create fund' });
    }
  });

  // Fund allocations
  app.post('/api/allocations', authenticate, async (req, res) => {
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

  // Deal assignments
  app.post('/api/deals/:dealId/assign', authenticate, async (req, res) => {
    try {
      const dealId = Number(req.params.dealId);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID required' });
      }
      
      // Make sure deal and user exist
      const deal = await storage.getDeal(dealId);
      const user = await storage.getUser(userId);
      
      if (!deal) {
        return res.status(404).json({ message: 'Deal not found' });
      }
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const assignmentData = insertDealAssignmentSchema.parse({
        dealId,
        userId
      });
      
      const assignment = await storage.assignUserToDeal(assignmentData);
      
      // Return assignment with user info
      res.status(201).json({
        ...assignment,
        user: {
          id: user.id,
          fullName: user.fullName,
          initials: user.initials,
          avatarColor: user.avatarColor,
          role: user.role
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid assignment data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to assign user to deal' });
    }
  });

  app.delete('/api/deals/:dealId/assign/:userId', authenticate, async (req, res) => {
    try {
      const dealId = Number(req.params.dealId);
      const userId = Number(req.params.userId);
      
      const success = await storage.unassignUserFromDeal(dealId, userId);
      if (!success) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to unassign user from deal' });
    }
  });

  // Get leaderboard (deals ranked by score)
  app.get('/api/leaderboard', authenticate, async (req, res) => {
    try {
      const deals = await storage.getDeals();
      
      // For each deal, calculate score based on mini memos and get star count
      const dealsWithScores = await Promise.all(deals.map(async (deal) => {
        const stars = await storage.getDealStars(deal.id);
        const miniMemos = await storage.getMiniMemosByDeal(deal.id);
        
        // Calculate score from mini memos
        let score = 0;
        if (miniMemos.length > 0) {
          score = Math.floor(miniMemos.reduce((sum, memo) => sum + memo.score, 0) / miniMemos.length);
        }
        
        return {
          id: deal.id,
          name: deal.name,
          stage: deal.stage,
          stageLabel: DealStageLabels[deal.stage],
          score,
          starCount: stars.length,
          // Fake score change for demo (would be calculated from historical data in real app)
          change: Math.floor(Math.random() * 20) - 10
        };
      }));
      
      // Sort by score (highest first)
      const sortedDeals = dealsWithScores.sort((a, b) => b.score - a.score);
      
      res.json(sortedDeals);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', authenticate, async (req, res) => {
    try {
      const deals = await storage.getDeals();
      
      // Count deals by stage
      const dealsByStage = deals.reduce((acc, deal) => {
        acc[deal.stage] = (acc[deal.stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Get fund data
      const funds = await storage.getFunds();
      const totalAum = funds.reduce((sum, fund) => sum + fund.aum, 0);
      
      // Calculate active deals (all except closed/passed)
      const activeDeals = deals.filter(deal => 
        deal.stage !== 'closed' && deal.stage !== 'passed'
      ).length;
      
      // Calculate new deals in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newDeals = deals.filter(deal => 
        deal.createdAt > thirtyDaysAgo
      ).length;
      
      res.json({
        activeDeals,
        newDeals,
        inIcReview: dealsByStage.ic_review || 0,
        totalAum,
        // Fake metrics for demo
        activeDealsTrend: 12, // 12% increase
        newDealsTrend: -8,    // 8% decrease
        icReviewTrend: 3,     // 3 new this week
        aumTrend: 4.2         // 4.2% Q2 performance
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  // Activity feed
  app.get('/api/activity', authenticate, async (req, res) => {
    try {
      // Get all timeline events, sorted by creation date (newest first)
      const allEvents = Array.from((await storage.getTimelineEventsByDeal(0)).values())
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10); // Limit to 10 most recent events
      
      // Get all the deals and users referenced in the events
      const dealIds = [...new Set(allEvents.map(e => e.dealId))];
      const userIds = [...new Set(allEvents.map(e => e.createdBy))];
      
      const deals = await Promise.all(dealIds.map(id => storage.getDeal(id)));
      const users = await Promise.all(userIds.map(id => storage.getUser(id)));
      
      // Enrich events with deal and user info
      const enrichedEvents = allEvents.map(event => {
        const deal = deals.find(d => d?.id === event.dealId);
        const user = users.find(u => u?.id === event.createdBy);
        
        return {
          ...event,
          deal: deal ? {
            id: deal.id,
            name: deal.name,
            stage: deal.stage,
            stageLabel: DealStageLabels[deal.stage]
          } : null,
          user: user ? {
            id: user.id,
            fullName: user.fullName,
            initials: user.initials,
            avatarColor: user.avatarColor
          } : null
        };
      });
      
      res.json(enrichedEvents);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch activity feed' });
    }
  });

  // Email ingestion - This would be a real implementation in a production app
  app.post('/api/email/ingest', authenticate, async (req, res) => {
    try {
      // In a real app, this would parse email content
      // For the MVP, we'll simulate ingestion with provided fields
      const { subject, sender, body, date } = req.body;
      
      if (!subject || !sender) {
        return res.status(400).json({ message: 'Subject and sender required' });
      }
      
      // Create a new deal from the email
      const dealData = {
        name: subject,
        description: body || 'Automatically created from email',
        industry: 'Unspecified',
        stage: 'initial_review',
        round: 'Unknown',
        contactEmail: sender,
        notes: `Received via email on ${date || new Date().toISOString()}`,
        createdBy: (req as any).user.id,
        tags: ['email-ingested']
      };
      
      const newDeal = await storage.createDeal(dealData as any);
      
      // Automatically assign creator to the deal
      await storage.assignUserToDeal({
        dealId: newDeal.id,
        userId: (req as any).user.id
      });
      
      res.status(201).json(newDeal);
    } catch (error) {
      res.status(500).json({ message: 'Failed to ingest email' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
