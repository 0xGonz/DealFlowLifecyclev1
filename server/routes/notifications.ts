import { Router } from 'express';
import { StorageFactory } from '../storage-factory';
import { asyncHandler } from '../utils/errorHandlers';
import { requireAuth } from '../utils/auth';

const storage = StorageFactory.getStorage();
export const notificationsRouter = Router();

// Apply authentication middleware to all routes
notificationsRouter.use(requireAuth);

// Get all notifications for the current user
notificationsRouter.get('/', asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const notifications = await storage.getUserNotifications(userId as number);
  res.status(200).json(notifications);
}));

// Get unread notification count
notificationsRouter.get('/unread-count', asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const count = await storage.getUnreadNotificationsCount(userId as number);
  res.status(200).json({ count });
}));

// Mark a notification as read
notificationsRouter.patch('/:id/mark-read', asyncHandler(async (req, res) => {
  const notificationId = parseInt(req.params.id);
  const success = await storage.markNotificationAsRead(notificationId);
  
  if (!success) {
    return res.status(404).json({
      status: 'fail',
      message: 'Notification not found'
    });
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Notification marked as read'
  });
}));

// Mark all notifications as read
notificationsRouter.post('/mark-all-read', asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const success = await storage.markAllNotificationsAsRead(userId as number);
  
  res.status(200).json({
    status: 'success',
    message: 'All notifications marked as read'
  });
}));