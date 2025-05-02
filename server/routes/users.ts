import { Router, Request, Response, NextFunction } from 'express';
import { StorageFactory } from '../storage-factory';
import * as z from 'zod';
import { AppError, asyncHandler } from '../utils/errorHandlers';
import { requireAuth, requireRole } from '../utils/auth';

export const usersRouter = Router();

// Validation schema for updating user
const updateUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
});

// Get all users (admin only)
usersRouter.get(
  '/',
  requireAuth,
  requireRole(['admin']),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const storage = StorageFactory.getStorage();
    const users = await storage.getUsers();
    
    // Remove passwords from response
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.status(200).json(usersWithoutPasswords);
  })
);

// Get user by ID
usersRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return next(new AppError('Invalid user ID', 400));
    }
    
    // Only allow admins or the user themselves to access the profile
    if (req.session.userId !== userId && req.query.role !== 'admin') {
      return next(new AppError('Not authorized to view this user', 403));
    }
    
    const storage = StorageFactory.getStorage();
    const user = await storage.getUser(userId);
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    
    res.status(200).json(userWithoutPassword);
  })
);

// Update user profile
usersRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return next(new AppError('Invalid user ID', 400));
    }
    
    // Only allow the user themselves to update their profile
    if (req.session.userId !== userId) {
      return next(new AppError('Not authorized to update this user', 403));
    }
    
    // Validate request body
    const validatedData = updateUserSchema.parse(req.body);
    
    const storage = StorageFactory.getStorage();
    
    // Check if email already exists (if being updated)
    if (validatedData.email) {
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail && existingEmail.id !== userId) {
        return next(new AppError('Email already registered', 400));
      }
    }
    
    const updatedUser = await storage.updateUser(userId, validatedData);
    
    if (!updatedUser) {
      return next(new AppError('User not found', 404));
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;
    
    res.status(200).json(userWithoutPassword);
  })
);

// Get user's deal assignments
usersRouter.get(
  '/:id/assignments',
  requireAuth,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return next(new AppError('Invalid user ID', 400));
    }
    
    // Only allow admins or the user themselves to access assignments
    if (req.session.userId !== userId && req.query.role !== 'admin') {
      return next(new AppError('Not authorized to view these assignments', 403));
    }
    
    const storage = StorageFactory.getStorage();
    const assignments = await storage.getUserAssignments(userId);
    
    res.status(200).json(assignments);
  })
);

// Get user's notifications
usersRouter.get(
  '/:id/notifications',
  requireAuth,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return next(new AppError('Invalid user ID', 400));
    }
    
    // Only allow the user themselves to access their notifications
    if (req.session.userId !== userId) {
      return next(new AppError('Not authorized to view these notifications', 403));
    }
    
    const storage = StorageFactory.getStorage();
    const notifications = await storage.getUserNotifications(userId);
    
    res.status(200).json(notifications);
  })
);

// Mark notification as read
usersRouter.patch(
  '/:userId/notifications/:notificationId',
  requireAuth,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = parseInt(req.params.userId);
    const notificationId = parseInt(req.params.notificationId);
    
    if (isNaN(userId) || isNaN(notificationId)) {
      return next(new AppError('Invalid user ID or notification ID', 400));
    }
    
    // Only allow the user themselves to mark their notifications
    if (req.session.userId !== userId) {
      return next(new AppError('Not authorized to update this notification', 403));
    }
    
    const storage = StorageFactory.getStorage();
    const success = await storage.markNotificationAsRead(notificationId);
    
    if (!success) {
      return next(new AppError('Notification not found', 404));
    }
    
    res.status(200).json({ status: 'success', message: 'Notification marked as read' });
  })
);

// Mark all notifications as read
usersRouter.patch(
  '/:id/notifications',
  requireAuth,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return next(new AppError('Invalid user ID', 400));
    }
    
    // Only allow the user themselves to mark their notifications
    if (req.session.userId !== userId) {
      return next(new AppError('Not authorized to update these notifications', 403));
    }
    
    const storage = StorageFactory.getStorage();
    const success = await storage.markAllNotificationsAsRead(userId);
    
    if (!success) {
      return next(new AppError('Failed to update notifications', 500));
    }
    
    res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
  })
);
