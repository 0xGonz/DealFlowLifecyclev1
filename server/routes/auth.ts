import { Router } from 'express';
import { z } from 'zod';
import { StorageFactory } from '../storage-factory';
import { asyncHandler } from '../utils/errorHandlers';
import { hashPassword, comparePasswords, requireAuth } from '../utils/auth';
import { generateInitials } from '../utils/string';
import { insertUserSchema } from '@shared/schema';

const storage = StorageFactory.getStorage();
export const authRouter = Router();

// Login route
const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

authRouter.post('/login', asyncHandler(async (req, res) => {
  const { identifier, password } = loginSchema.parse(req.body);
  
  // Find user by username or email
  const user = await storage.getUserByUsername(identifier) || 
    await storage.getUserByEmail(identifier);
  
  if (!user) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid credentials'
    });
  }
  
  // Verify password
  const passwordMatch = await comparePasswords(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid credentials'
    });
  }
  
  // Set session
  req.session.userId = user.id;
  
  // Save the session explicitly to ensure it persists
  req.session.save((err) => {
    if (err) {
      console.error('Error saving session:', err);
    }
  });
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  res.status(200).json(userWithoutPassword);
}));

// Registration route - using the insertUserSchema from shared/schema.ts
const extendedRegisterSchema = insertUserSchema
  .extend({
    // User schema already has validation from drizzle-zod
    passwordConfirm: z.string().min(8, 'Password confirmation must be at least 8 characters'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  });

authRouter.post('/register', asyncHandler(async (req, res) => {
  const validatedData = extendedRegisterSchema.parse(req.body);
  
  // Check if username already exists
  const existingUsername = await storage.getUserByUsername(validatedData.username);
  if (existingUsername) {
    return res.status(400).json({
      status: 'fail',
      message: 'Username already exists'
    });
  }
  
  // Check if email already exists
  const existingEmail = await storage.getUserByEmail(validatedData.email);
  if (existingEmail) {
    return res.status(400).json({
      status: 'fail',
      message: 'Email already exists'
    });
  }
  
  // Hash password
  const hashedPassword = await hashPassword(validatedData.password);
  
  // Generate initials from full name
  const initials = generateInitials(validatedData.fullName);
  
  // Remove passwordConfirm field and add initials
  const { passwordConfirm, ...userData } = validatedData;
  
  // Create user with initials
  // We use any type to work around the schema limitation
  // since we're adding initials which is not in the InsertUser type
  const userDataWithInitials: any = {
    ...userData,
    password: hashedPassword,
    initials,
  };
  
  const newUser = await storage.createUser(userDataWithInitials);
  
  // Set session
  req.session.userId = newUser.id;
  
  // Save the session explicitly to ensure it persists
  req.session.save((err) => {
    if (err) {
      console.error('Error saving session:', err);
    }
  });
  
  // Return user without password
  const { password, ...userWithoutPassword } = newUser;
  res.status(201).json(userWithoutPassword);
}));

// Logout route
authRouter.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to log out'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  });
});

// Debug route to check session status
authRouter.get('/session-debug', (req, res) => {
  res.json({
    sessionExists: !!req.session,
    userIdInSession: req.session?.userId || null,
    userInRequest: !!req.user,
    cookies: req.headers.cookie || 'No cookies found',
    currentTime: new Date().toISOString()
  });
});

// Get current user route - removed requireAuth middleware for debugging
authRouter.get('/me', asyncHandler(async (req, res) => {
  console.log('GET /api/auth/me called', {
    sessionExists: !!req.session,
    userId: req.session?.userId,
    user: req.user
  });

  // If not authenticated, return 401 but with a clear message
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      status: 'fail',
      message: 'No active session found',
      debug: { hasSession: !!req.session }
    });
  }
  
  if (!req.user) {
    const storage = StorageFactory.getStorage();
    try {
      // Try to get user from storage directly
      const user = await storage.getUser(req.session.userId);
      if (user) {
        // Don't include password in response
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      } else {
        return res.status(401).json({
          status: 'fail',
          message: 'User not found in database',
          debug: { userId: req.session.userId }
        });
      }
    } catch (err) {
      console.error('Error fetching user in /me endpoint:', err);
      return res.status(500).json({
        status: 'error',
        message: 'Server error when fetching user'
      });
    }
  }
  
  // Return the user object which already has password removed
  res.status(200).json(req.user);
}));
