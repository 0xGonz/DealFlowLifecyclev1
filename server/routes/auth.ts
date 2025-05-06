import express, { Request, Response } from 'express';
import { asyncHandler } from '../utils/errorHandlers';
import { login, logout, getCurrentUser, hashPassword, registerUser } from '../utils/auth';
import { z } from 'zod';
import { StorageFactory } from '../storage-factory';
import { insertUserSchema } from '@shared/schema';

const router = express.Router();

// Login validation schema
const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// Login route
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('Login request received for username:', req.body?.username);
    
    // Validate request body
    const validatedData = loginSchema.safeParse(req.body);
    if (!validatedData.success) {
      console.error('Login validation failed:', validatedData.error.errors);
      return res.status(400).json({ message: 'Invalid login data', errors: validatedData.error.format() });
    }
    
    const { username, password } = validatedData.data;
    
    // Attempt login
    console.log('Attempting login for user:', username);
    const user = await login(req, username, password);
    console.log('Login successful for user:', username);
    
    // Return user info (without password)
    const { password: _, ...userWithoutPassword } = user;
    console.log('Returning user data without password');
    
    // Return user directly, not wrapped in an object
    return res.json(userWithoutPassword);
  } catch (error) {
    console.error('Login route error:', error);
    throw error; // Let the error handler middleware handle it
  }
}));

// Logout route
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  await logout(req);
  return res.json({ success: true, message: 'Logged out successfully' });
}));

// Get current user route
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  
  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // Return user info (without password)
  const { password: _, ...userWithoutPassword } = user;
  // Return user directly, not wrapped in an object
  return res.json(userWithoutPassword);
}));

// Registration validation schema
const registrationSchema = insertUserSchema.extend({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  initials: z.string().max(3, 'Initials must be at most 3 characters').optional(),
  passwordConfirm: z.string().min(6, 'Password confirmation must be at least 6 characters')
})
.refine(data => data.password === data.passwordConfirm, {
  message: 'Passwords do not match',
  path: ['passwordConfirm'],
});

// Register route - public registration always creates analyst users
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('Handling public registration request');
    
    // Validate request body
    const validatedData = registrationSchema.parse(req.body);
    
    // Remove passwordConfirm (it's just for validation)
    const { passwordConfirm, ...userData } = validatedData;
    
    // Self registration should always create users with analyst role or lower
    if (!userData.role || userData.role === 'admin' || userData.role === 'partner') {
      console.log(`Overriding requested role ${userData.role} to 'analyst' for public registration`);
      userData.role = 'analyst';
    }
    
    // If initials are not provided, generate them from full name
    if (!userData.initials) {
      userData.initials = userData.fullName
        .split(' ')
        .map(name => name[0])
        .join('')
        .slice(0, 3)
        .toUpperCase();
    }
    
    // Generate a random avatar color if not provided
    if (!userData.avatarColor) {
      const colors = ['#4f46e5', '#0891b2', '#ea580c', '#be123c', '#7c3aed', '#059669', '#dc2626'];
      userData.avatarColor = colors[Math.floor(Math.random() * colors.length)];
    }
    
    console.log(`Creating new user via public registration (role: ${userData.role})`);
    
    // Register the new user
    const user = await registerUser(req, userData);
    
    // Return user info (without password)
    const { password: _, ...userWithoutPassword } = user;
    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Error in /register endpoint:', error);
    throw error;
  }
}));

export default router;
