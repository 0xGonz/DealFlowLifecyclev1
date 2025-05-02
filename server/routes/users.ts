import { Router, Request, Response, NextFunction } from 'express';
import { StorageFactory } from '../storage-factory';
import * as z from 'zod';
import { AppError } from '../utils/errorHandlers';
import { generateInitials, generateRandomColor } from '../utils/string';
import { requireAuth, requireAdmin } from '../utils/auth';

const usersRouter = Router();

// Update user schema validation
const updateUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
  avatarColor: z.string().nullable().optional()
});

// Get all users (admin only)
usersRouter.get('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storage = StorageFactory.getStorage();
    const users = await storage.getUsers();
    
    // Remove password from response
    const usersWithoutPassword = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.status(200).json(usersWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Get user by ID
usersRouter.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw new AppError('Invalid user ID', 400);
    }
    
    // Only allow users to access their own profile unless they're an admin
    if (req.session.userId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Not authorized to access this user profile', 403);
    }
    
    const storage = StorageFactory.getStorage();
    const user = await storage.getUser(userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Update user by ID
usersRouter.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw new AppError('Invalid user ID', 400);
    }
    
    // Only allow users to update their own profile unless they're an admin
    if (req.session.userId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Not authorized to update this user profile', 403);
    }
    
    // Validate request body
    const validatedData = updateUserSchema.parse(req.body);
    
    const storage = StorageFactory.getStorage();
    
    // Get current user data
    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      throw new AppError('User not found', 404);
    }
    
    // Update initials if fullName changed
    let initials = currentUser.initials;
    if (validatedData.fullName) {
      initials = generateInitials(validatedData.fullName);
    }
    
    // Update user
    const updatedUser = await storage.updateUser(userId, {
      ...validatedData,
      initials
    });
    
    if (!updatedUser) {
      throw new AppError('Failed to update user', 500);
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

export { usersRouter };
