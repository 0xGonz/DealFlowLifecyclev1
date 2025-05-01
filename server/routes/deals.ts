import { Router, Request, Response } from "express";
import { StorageFactory } from "../storage-factory";
import { 
  insertDealSchema, 
  insertTimelineEventSchema, 
  insertDealStarSchema,
  insertMiniMemoSchema,
  DealStageLabels
} from "@shared/schema";
import { z } from "zod";
import { IStorage } from "../storage";

const router = Router();

// Helper function to get a fresh storage instance in each request
function getStorage(): IStorage {
  return StorageFactory.getStorage();
}

// Get all deals or filter by stage
router.get('/', async (req: Request, res: Response) => {
  try {
    const storage = getStorage();
    let deals;
    
    if (req.query.stage) {
      // Cast to the correct type for stage
      deals = await storage.getDealsByStage(req.query.stage as any);
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

// Get a specific deal by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Check if the ID is valid
    if (req.params.id === 'undefined' || req.params.id === 'null') {
      return res.status(400).json({ message: 'Invalid deal ID' });
    }
    
    const dealId = Number(req.params.id);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: 'Invalid deal ID format' });
    }
    
    const storage = StorageFactory.getStorage();
    const deal = await storage.getDeal(dealId);
    
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

// Create a new deal
router.post('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const dealData = insertDealSchema.parse({
      ...req.body,
      createdBy: user.id
    });
    
    const storage = StorageFactory.getStorage();
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

// Update a deal
router.patch('/:id', async (req: Request, res: Response) => {
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

// Get timeline events for a deal
router.get('/:dealId/timeline', async (req: Request, res: Response) => {
  try {
    const dealId = Number(req.params.dealId);
    
    // Make sure deal exists
    const deal = await storage.getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    const events = await storage.getTimelineEventsByDeal(dealId);
    
    // Get user info for each event
    const userIds = Array.from(new Set(events.map(e => e.createdBy)));
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

// Create a timeline event for a deal
router.post('/:dealId/timeline', async (req: Request, res: Response) => {
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

// Star a deal
router.post('/:dealId/star', async (req: Request, res: Response) => {
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

// Unstar a deal
router.delete('/:dealId/star', async (req: Request, res: Response) => {
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

// Assign a user to a deal
router.post('/:dealId/assignments', async (req: Request, res: Response) => {
  try {
    const dealId = Number(req.params.dealId);
    const { userId } = req.body;
    const currentUser = (req as any).user;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Make sure deal exists
    const deal = await storage.getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Make sure user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check role-based permissions
    // Only admins and partners can assign admins or partners
    // Everyone can assign analysts and observers
    if ((user.role === 'admin' || user.role === 'partner') && 
        !(currentUser.role === 'admin' || currentUser.role === 'partner')) {
      return res.status(403).json({ 
        message: 'You do not have permission to assign users with this role'
      });
    }
    
    const assignment = await storage.assignUserToDeal({
      dealId,
      userId
    });
    
    // Create a timeline event for the assignment
    await storage.createTimelineEvent({
      dealId,
      eventType: 'note',
      content: `${user.fullName} (${user.role}) was assigned to this deal by ${currentUser.fullName}`,
      createdBy: currentUser.id,
      metadata: { assignedUserId: userId }
    });
    
    // Create a notification for the assigned user
    await storage.createNotification({
      userId,
      title: 'New assignment',
      message: `You've been assigned to deal: ${deal.name}`,
      type: 'assignment',
      relatedId: dealId
    });
    
    // Get assigned user details
    const assignedUser = {
      id: user.id,
      fullName: user.fullName,
      initials: user.initials,
      avatarColor: user.avatarColor,
      role: user.role
    };
    
    res.status(201).json({ ...assignment, user: assignedUser });
  } catch (error) {
    res.status(500).json({ message: 'Failed to assign user to deal' });
  }
});

// Get assignments for a deal
router.get('/:dealId/assignments', async (req: Request, res: Response) => {
  try {
    const dealId = Number(req.params.dealId);
    
    // Make sure deal exists
    const deal = await storage.getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    const assignments = await storage.getDealAssignments(dealId);
    
    // Get user details for each assignment
    const assignedUsers = await Promise.all(
      assignments.map(async (assignment) => {
        const user = await storage.getUser(assignment.userId);
        return user ? {
          assignment,
          user: {
            id: user.id,
            fullName: user.fullName,
            initials: user.initials,
            avatarColor: user.avatarColor,
            role: user.role
          }
        } : null;
      })
    );
    
    // Filter out null values (if any user wasn't found)
    res.json(assignedUsers.filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch deal assignments' });
  }
});

// Unassign a user from a deal
router.delete('/:dealId/assignments/:userId', async (req: Request, res: Response) => {
  try {
    const dealId = Number(req.params.dealId);
    const userId = Number(req.params.userId);
    const currentUser = (req as any).user;
    
    // Make sure deal exists
    const deal = await storage.getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Make sure user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check role-based permissions
    // Only admins and partners can unassign admins or partners
    // Everyone can unassign analysts and observers
    if ((user.role === 'admin' || user.role === 'partner') && 
        !(currentUser.role === 'admin' || currentUser.role === 'partner')) {
      return res.status(403).json({ 
        message: 'You do not have permission to unassign users with this role'
      });
    }
    
    // Users can unassign themselves regardless of role
    const isSelfUnassign = userId === currentUser.id;
    
    const success = await storage.unassignUserFromDeal(dealId, userId);
    if (!success) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    
    // Create a timeline event for the unassignment
    await storage.createTimelineEvent({
      dealId,
      eventType: 'note',
      content: isSelfUnassign 
        ? `${user.fullName} left the deal team` 
        : `${user.fullName} was removed from the deal team by ${currentUser.fullName}`,
      createdBy: currentUser.id,
      metadata: { unassignedUserId: userId }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to unassign user from deal' });
  }
});

// Delete a deal
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Check if the ID is valid
    if (req.params.id === 'undefined' || req.params.id === 'null') {
      return res.status(400).json({ message: 'Invalid deal ID' });
    }
    
    const dealId = Number(req.params.id);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: 'Invalid deal ID format' });
    }
    
    // Make sure deal exists
    const deal = await storage.getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Delete the deal
    const success = await storage.deleteDeal(dealId);
    if (!success) {
      return res.status(500).json({ message: 'Failed to delete deal' });
    }
    
    res.json({ success: true, message: 'Deal deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete deal' });
  }
});

// Get mini memos for a deal
router.get('/:dealId/memos', async (req: Request, res: Response) => {
  try {
    const dealId = Number(req.params.dealId);
    
    // Make sure deal exists
    const deal = await storage.getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    const memos = await storage.getMiniMemosByDeal(dealId);
    
    // Get user info for each memo
    const userIds = Array.from(new Set(memos.map(m => m.userId)));
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

// Create a mini memo for a deal
router.post('/:dealId/memos', async (req: Request, res: Response) => {
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

export default router;