import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { insertNotificationSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all notifications for a user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const notifications = await storage.getUserNotifications(userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// Get count of unread notifications
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const count = await storage.getUnreadNotificationsCount(userId);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch unread notifications count' });
  }
});

// Mark a notification as read
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const id = Number(req.params.id);
    const success = await storage.markNotificationAsRead(id);
    
    if (!success) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.post('/mark-all-read', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    await storage.markAllNotificationsAsRead(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
});

// Create a notification (for testing or internal use)
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const parsedBody = insertNotificationSchema.parse(req.body);
    const notification = await storage.createNotification(parsedBody);
    res.status(201).json(notification);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Invalid notification data', errors: error.errors });
    } else {
      res.status(500).json({ message: 'Failed to create notification' });
    }
  }
});

export default router;