import express, { Request, Response } from 'express';
import { asyncHandler } from '../utils/errorHandlers';
import { login, logout, getCurrentUser, register } from '../utils/auth';
import { StorageFactory } from '../storage-factory';
import { insertUserSchema } from '@shared/schema';
import { z } from 'zod';

const router = express.Router();

// Login validation schema
const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// Login route
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const { username, password } = loginSchema.parse(req.body);
  
  // Attempt login
  const user = await login(req, username, password);
  
  // Return user info (without password)
  const { password: _, ...userWithoutPassword } = user;
  return res.json({ user: userWithoutPassword });
}));

// Logout route
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  await logout(req);
  return res.json({ success: true, message: 'Logged out successfully' });
}));

// Register new user route
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  // Validate input using schema from shared/schema.ts
  const userData = insertUserSchema.parse(req.body);
  
  // Check if username exists
  const storage = StorageFactory.getStorage();
  const existingUser = await storage.getUserByUsername(userData.username);
  
  if (existingUser) {
    return res.status(400).json({ message: 'Username already exists' });
  }
  
  // Register user (will hash password in the register function)
  const newUser = await register(userData);
  
  // Login the new user
  await login(req, userData.username, userData.password);
  
  // Return user info (without password)
  const { password: _, ...userWithoutPassword } = newUser;
  return res.status(201).json({ user: userWithoutPassword });
}));

// Get current user route
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  
  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // Return user info (without password)
  const { password: _, ...userWithoutPassword } = user;
  return res.json({ user: userWithoutPassword });
}));

// Update user profile
router.patch('/:userId', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = await getCurrentUser(req);
  
  if (!currentUser) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const userId = parseInt(req.params.userId);
  
  // Only allow users to update their own profile unless they're admin
  if (userId !== currentUser.id && currentUser.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized to update this user' });
  }
  
  // Get validation schema (partial to allow updating only some fields)
  const updateSchema = insertUserSchema.partial().omit({ password: true });
  
  // Validate input
  const userData = updateSchema.parse(req.body);
  
  // Update user 
  const storage = StorageFactory.getStorage();
  const updatedUser = await storage.updateUser(userId, userData);
  
  if (!updatedUser) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  // Return updated user (without password)
  const { password: _, ...userWithoutPassword } = updatedUser;
  return res.json({ user: userWithoutPassword });
}));

export default router;
