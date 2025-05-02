import { Router } from 'express';
import { z } from 'zod';
import { StorageFactory } from '../storage-factory';
import { asyncHandler } from '../utils/errorHandlers';
import { requireAuth } from '../utils/auth';
import { generateInitials } from '../utils/string';
import { hashPassword, comparePasswords } from '../utils/auth';
import { User } from '@shared/schema';

const storage = StorageFactory.getStorage();
export const usersRouter = Router();

// Get all users
usersRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  const users = await storage.getUsers();
  
  // Map to remove passwords from response
  const safeUsers = users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
  
  res.status(200).json(safeUsers);
}));

// Get user by ID
usersRouter.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  
  if (isNaN(userId)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid user ID format'
    });
  }
  
  const user = await storage.getUser(userId);
  
  if (!user) {
    return res.status(404).json({
      status: 'fail',
      message: 'User not found'
    });
  }
  
  // Remove password from response
  const { password, ...userWithoutPassword } = user;
  res.status(200).json(userWithoutPassword);
}));

// Update user (profile data)
const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  role: z.enum(['admin', 'partner', 'analyst', 'observer']).optional(),
  avatarColor: z.string().nullable().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').optional(),
}).refine(data => {
  // If new password is provided, current password must also be provided
  return !(data.newPassword && !data.currentPassword);
}, {
  message: 'Current password is required when setting a new password',
  path: ['currentPassword']
});

usersRouter.patch('/:id', requireAuth, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  
  if (isNaN(userId)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid user ID format'
    });
  }
  
  // Check if user exists
  const userToUpdate = await storage.getUser(userId);
  if (!userToUpdate) {
    return res.status(404).json({
      status: 'fail',
      message: 'User not found'
    });
  }
  
  // Validate request data
  const validatedInput = updateUserSchema.parse(req.body);
  
  // Only allow users to update their own profile unless they are admin
  const currentUser = await storage.getUser(req.session.userId!);
  if (userId !== req.session.userId && currentUser?.role !== 'admin') {
    return res.status(403).json({
      status: 'fail',
      message: 'You can only update your own profile'
    });
  }
  
  // Prepare update data object
  let updateData: Partial<User> = {
    ...validatedInput
  };
  
  // Handle password update if requested
  if (validatedInput.newPassword && validatedInput.currentPassword) {
    // Verify current password
    const isPasswordCorrect = await comparePasswords(
      validatedInput.currentPassword,
      userToUpdate.password
    );
    
    if (!isPasswordCorrect) {
      return res.status(400).json({
        status: 'fail',
        message: 'Current password is incorrect'
      });
    }
    
    // Hash the new password
    updateData.password = await hashPassword(validatedInput.newPassword);
  }
  
  // Handle fullName update - generate new initials if needed
  if (validatedInput.fullName && validatedInput.fullName !== userToUpdate.fullName) {
    updateData.initials = generateInitials(validatedInput.fullName);
  }
  
  // Remove the temporary fields not in the actual database schema
  const { currentPassword, newPassword, ...cleanUpdateData } = updateData as any;
  
  // Update user
  const updatedUser = await storage.updateUser(userId, cleanUpdateData);
  
  if (!updatedUser) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update user'
    });
  }
  
  // Remove password from response
  const { password, ...userWithoutPassword } = updatedUser;
  res.status(200).json(userWithoutPassword);
}));
