import { Router, Request, Response, NextFunction } from 'express';
import { StorageFactory } from '../storage-factory';
import * as z from 'zod';
import { AppError, asyncHandler } from '../utils/errorHandlers';
import { generatePasswordHash, requireAuth, requireAdmin, comparePassword } from '../utils/auth';
import { generateInitials, generateRandomColor } from '../utils/string';

export const usersRouter = Router();

// Validation schema for updating a user
const updateUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
  // Allowing role updates only by admins in the route handler
  role: z.enum(['admin', 'partner', 'analyst', 'observer']).optional(),
  // Allow password update with validation
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').optional(),
}).refine(data => {
  // If new password is provided, current password must also be provided
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: 'Current password is required to set a new password',
  path: ['currentPassword']
});

// Get all users (admin only)
usersRouter.get(
  '/',
  requireAdmin,
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

// Get a specific user
usersRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return next(new AppError('Invalid user ID', 400));
    }
    
    // Users can only see themselves unless they're admins
    if (req.session.userId !== userId && !(await isUserAdmin(req.session.userId!))) {
      return next(new AppError('Unauthorized', 403));
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

// Update a user
usersRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        return next(new AppError('Invalid user ID', 400));
      }
      
      // Users can only update themselves unless they're admins
      const isAdmin = await isUserAdmin(req.session.userId!);
      if (req.session.userId !== userId && !isAdmin) {
        return next(new AppError('Unauthorized', 403));
      }
      
      // Validate request body
      const validatedData = updateUserSchema.parse(req.body);
      
      const storage = StorageFactory.getStorage();
      const user = await storage.getUser(userId);
      
      if (!user) {
        return next(new AppError('User not found', 404));
      }
      
      // Handle role updates - only admins can update roles
      if (validatedData.role && !isAdmin) {
        delete validatedData.role;
      }
      
      // Handle password updates
      let updateData: Partial<typeof validatedData> = { ...validatedData };
      delete updateData.currentPassword;
      delete updateData.newPassword;
      
      if (validatedData.currentPassword && validatedData.newPassword) {
        const { currentPassword, newPassword } = validatedData;
        const isValidPassword = await comparePassword(currentPassword, user.password);
        
        if (!isValidPassword) {
          return next(new AppError('Current password is incorrect', 400));
        }
        
        // Hash new password and add to update data
        updateData.password = await generatePasswordHash(newPassword);
      }
      
      // If fullName is changed, update initials
      if (validatedData.fullName) {
        updateData.initials = generateInitials(validatedData.fullName);
      }
      
      // Update user
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return next(new AppError('Failed to update user', 500));
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(`Validation error: ${error.errors[0].message}`, 400));
      }
      next(error);
    }
  })
);

// Helper function to check if a user is an admin
async function isUserAdmin(userId: number): Promise<boolean> {
  const storage = StorageFactory.getStorage();
  const user = await storage.getUser(userId);
  return user?.role === 'admin' || false;
}
