import { Router, Request, Response } from "express";
import { dealController } from "../controllers/deal.controller";
import { requireAuth } from "../utils/auth";
import { requirePermission } from "../utils/permissions";
import { z } from "zod";
import { insertMiniMemoSchema } from "@shared/schema";
import { StorageFactory } from "../storage-factory";

const router = Router();

// Helper function to get a fresh storage instance in each request
function getStorage() {
  return StorageFactory.getStorage();
}

// Deal routes
router.get('/', requireAuth, dealController.getDeals.bind(dealController));
router.get('/:id', requireAuth, dealController.getDealById.bind(dealController));
router.post('/', requireAuth, requirePermission('create', 'deal'), dealController.createDeal.bind(dealController));
router.patch('/:id', requireAuth, requirePermission('edit', 'deal'), dealController.updateDeal.bind(dealController));
router.delete('/:id', requireAuth, requirePermission('delete', 'deal'), dealController.deleteDeal.bind(dealController));

// Timeline routes
router.get('/:dealId/timeline', requireAuth, dealController.getDealTimeline.bind(dealController));
router.post('/:dealId/timeline', requireAuth, dealController.createTimelineEvent.bind(dealController));
router.put('/:dealId/timeline/:eventId', requireAuth, dealController.updateTimelineEvent.bind(dealController));
router.delete('/:dealId/timeline/:eventId', requireAuth, dealController.deleteTimelineEvent.bind(dealController));

// Star routes
router.get('/:dealId/stars', requireAuth, dealController.getDealStars.bind(dealController));
router.post('/:dealId/star', requireAuth, dealController.toggleDealStar.bind(dealController));

// Mini Memo routes
router.get('/:dealId/memos', requireAuth, async (req: Request, res: Response) => {
  try {
    const dealId = Number(req.params.dealId);
    
    const storage = getStorage();
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
    console.error("Error fetching mini memos:", error);
    res.status(500).json({ message: 'Failed to fetch mini memos' });
  }
});

router.post('/:dealId/memos', requireAuth, async (req: Request, res: Response) => {
  try {
    const dealId = Number(req.params.dealId);
    const user = (req as any).user;
    
    // User must be authenticated
    if (!user) {
      return res.status(401).json({ message: 'Authentication required to create memos' });
    }
    
    const userId = user.id;
    
    const storage = getStorage();
    // Make sure deal exists
    const deal = await storage.getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    const memoData = insertMiniMemoSchema.parse({
      ...req.body,
      dealId,
      userId
    });
    
    const newMemo = await storage.createMiniMemo(memoData);
    
    // Return with user info
    const userInfo = await storage.getUser(userId);
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
    console.error('Error creating mini memo:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid memo data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to create mini memo' });
  }
});

export default router;