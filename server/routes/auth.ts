import { Router, Request, Response, NextFunction } from 'express';
import { StorageFactory } from '../storage-factory';
import * as z from 'zod';
import { AppError, asyncHandler } from '../utils/errorHandlers';
import { generatePasswordHash, comparePassword } from '../utils/auth';
import { generateInitials, generateRandomColor } from '../utils/string';

export const authRouter = Router();

// Validation schema for user registration
const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  role: z.enum(['admin', 'partner', 'analyst', 'observer']).default('analyst'),
});

// Validation schema for user login
const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// Register a new user
authRouter.post(
  '/register',
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validatedData = registerSchema.parse(req.body);
      
      const storage = StorageFactory.getStorage();
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return next(new AppError('Username already taken', 400));
      }
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return next(new AppError('Email already registered', 400));
      }
      
      // Hash password
      const hashedPassword = await generatePasswordHash(validatedData.password);
      
      // Generate initials and avatar color
      const initials = generateInitials(validatedData.fullName);
      const avatarColor = generateRandomColor();
      
      // Create user
      const newUser = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
        initials,
        avatarColor,
      });
      
      // Set user ID in session
      req.session.userId = newUser.id;
      
      // Remove password from response
      const { password, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(`Validation error: ${error.errors[0].message}`, 400));
      }
      next(error);
    }
  })
);

// Login
authRouter.post(
  '/login',
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validatedData = loginSchema.parse(req.body);
      
      const storage = StorageFactory.getStorage();
      
      // Find user by username
      const user = await storage.getUserByUsername(validatedData.username);
      if (!user) {
        return next(new AppError('Invalid username or password', 401));
      }
      
      // Compare passwords
      const isPasswordValid = await comparePassword(validatedData.password, user.password);
      if (!isPasswordValid) {
        return next(new AppError('Invalid username or password', 401));
      }
      
      // Set user ID in session
      req.session.userId = user.id;
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(`Validation error: ${error.errors[0].message}`, 400));
      }
      next(error);
    }
  })
);

// Logout
authRouter.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    req.session.destroy(err => {
      if (err) {
        return next(new AppError('Error logging out', 500));
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ message: 'Logged out successfully' });
    });
  })
);

// Get current user
authRouter.get(
  '/me',
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return next(new AppError('Not authenticated', 401));
    }
    
    const storage = StorageFactory.getStorage();
    const user = await storage.getUser(req.session.userId);
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    
    res.status(200).json(userWithoutPassword);
  })
);
