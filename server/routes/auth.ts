import { Router, Request, Response, NextFunction } from 'express';
import { StorageFactory } from '../storage-factory';
import * as z from 'zod';
import { AppError } from '../utils/errorHandlers';
import { comparePassword, generatePasswordHash } from '../utils/auth';
import { generateInitials, generateRandomColor } from '../utils/string';

const authRouter = Router();

// Registration validation schema
const registrationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'partner', 'analyst', 'observer']).default('analyst'),
});

// Login validation schema
const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// User auth routes
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData = registrationSchema.parse(req.body);
    
    const storage = StorageFactory.getStorage();
    
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(validatedData.username);
    if (existingUser) {
      throw new AppError('Username already taken', 400);
    }
    
    // Check if email already exists
    const existingEmail = await storage.getUserByEmail(validatedData.email);
    if (existingEmail) {
      throw new AppError('Email already registered', 400);
    }
    
    // Hash password
    const hashedPassword = await generatePasswordHash(validatedData.password);
    
    // Generate initials from full name
    const initials = generateInitials(validatedData.fullName);
    
    // Generate a random color for the avatar
    const avatarColor = generateRandomColor();
    
    // Create user
    const newUser = await storage.createUser({
      username: validatedData.username,
      email: validatedData.email,
      password: hashedPassword,
      fullName: validatedData.fullName,
      initials,
      role: validatedData.role,
      avatarColor,
    });
    
    // Set session
    req.session.userId = newUser.id;
    
    // Return user data (without password)
    const { password, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);
    
    const storage = StorageFactory.getStorage();
    
    // Find user by username
    const user = await storage.getUserByUsername(validatedData.username);
    if (!user) {
      throw new AppError('Invalid username or password', 401);
    }
    
    // Check password
    const isPasswordValid = await comparePassword(validatedData.password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid username or password', 401);
    }
    
    // Set session
    req.session.userId = user.id;
    
    // Return user data (without password)
    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to logout',
      });
    }
    
    res.clearCookie('connect.sid');
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  });
});

authRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        status: 'fail',
        message: 'Not authenticated',
      });
    }
    
    const storage = StorageFactory.getStorage();
    const user = await storage.getUser(req.session.userId);
    
    if (!user) {
      // Clear invalid session
      req.session.destroy(() => {});
      return res.status(401).json({
        status: 'fail',
        message: 'User not found',
      });
    }
    
    // Return user data (without password)
    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

export { authRouter };
