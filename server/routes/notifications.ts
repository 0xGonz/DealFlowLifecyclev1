import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { insertNotificationSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Get all notifications for the current user
router.get('/', async (req: Request, res: Response) => {
  try {
    // We'd normally use req.session.userId but for demo purposes let's use a fixed user
    const userId = 1; // Using the first user (admin) for demo
    const notifications = await storage.getUserNotifications(userId);
    return res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// Get unread notification count
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    // We'd normally use req.session.userId but for demo purposes let's use a fixed user
    const userId = 1; // Using the first user (admin) for demo
    const count = await storage.getUnreadNotificationsCount(userId);
    return res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return res.status(500).json({ message: 'Failed to fetch unread notification count' });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    const success = await storage.markNotificationAsRead(id);
    if (!success) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.post('/mark-all-read', async (req: Request, res: Response) => {
  try {
    // We'd normally use req.session.userId but for demo purposes let's use a fixed user
    const userId = 1; // Using the first user (admin) for demo
    const success = await storage.markAllNotificationsAsRead(userId);
    return res.json({ success });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
});

// Create a new notification
router.post('/', async (req: Request, res: Response) => {
  try {
    const validationResult = insertNotificationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid notification data', 
        errors: validationResult.error.errors 
      });
    }

    const notification = await storage.createNotification(validationResult.data);
    return res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    return res.status(500).json({ message: 'Failed to create notification' });
  }
});

export default router;