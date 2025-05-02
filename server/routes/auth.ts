import { Router, Request, Response, NextFunction } from 'express';
import { StorageFactory } from '../storage-factory';
import * as z from 'zod';
import { AppError, asyncHandler } from '../utils/errorHandlers';
import { generatePasswordHash, comparePassword } from '../utils/auth';
import { generateInitials, generateRandomColor } from '../utils/string';

export const authRouter = Router();

// Login validation schema
const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

// Registration validation schema
const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['admin', 'partner', 'analyst', 'observer']).default('analyst'),
});

// Login endpoint
authRouter.post(
  '/login',
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identifier, password } = loginSchema.parse(req.body);
      
      const storage = StorageFactory.getStorage();
      
      // Check if identifier is an email or username
      const isEmail = identifier.includes('@');
      
      let user;
      if (isEmail) {
        user = await storage.getUserByEmail(identifier);
      } else {
        user = await storage.getUserByUsername(identifier);
      }
      
      if (!user) {
        return next(new AppError('Invalid credentials', 401));
      }
      
      // Compare passwords
      const isPasswordValid = await comparePassword(password, user.password);
      
      if (!isPasswordValid) {
        return next(new AppError('Invalid credentials', 401));
      }
      
      // Set user ID in session
      req.session.userId = user.id;
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(200).json({
        success: true,
        user: userWithoutPassword,
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(`Validation error: ${error.errors[0].message}`, 400));
      }
      next(error);
    }
  })
);

// Registration endpoint
authRouter.post(
  '/register',
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      const storage = StorageFactory.getStorage();
      
      // Check if username is already taken
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return next(new AppError('Username is already taken', 400));
      }
      
      // Check if email is already taken
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return next(new AppError('Email is already registered', 400));
      }
      
      // Hash password
      const hashedPassword = await generatePasswordHash(userData.password);
      
      // Generate initials and avatar color
      const initials = generateInitials(userData.fullName);
      const avatarColor = generateRandomColor();
      
      // Create user
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
        initials,
        avatarColor,
      });
      
      // Set user ID in session
      req.session.userId = newUser.id;
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json({
        success: true,
        user: userWithoutPassword,
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(`Validation error: ${error.errors[0].message}`, 400));
      }
      next(error);
    }
  })
);

// Logout endpoint
authRouter.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  })
);

// Get current user
authRouter.get(
  '/me',
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.session.userId) {
      return next(new AppError('Not authenticated', 401));
    }
    
    const storage = StorageFactory.getStorage();
    const user = await storage.getUser(req.session.userId);
    
    if (!user) {
      // Clear invalid session
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });
      
      return next(new AppError('User not found', 404));
    }
    
    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(200).json(userWithoutPassword);
  })
);
