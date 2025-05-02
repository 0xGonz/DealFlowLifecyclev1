import { Router, Request, Response, NextFunction } from 'express';
import { StorageFactory } from '../storage-factory';
import * as z from 'zod';
import { AppError } from '../utils/errorHandlers';
import { comparePassword, generatePasswordHash } from '../utils/auth';
import { generateInitials, generateRandomColor } from '../utils/string';

// Custom session type
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

const authRouter = Router();

// Register user schema validation
const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  role: z.enum(['admin', 'partner', 'analyst', 'observer']).default('analyst')
});

// Login schema validation
const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

// User registration endpoint
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);
    
    const storage = StorageFactory.getStorage();
    
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(validatedData.username);
    if (existingUser) {
      throw new AppError('Username already exists', 400);
    }
    
    // Generate initials and random avatar color
    const initials = generateInitials(validatedData.fullName);
    const avatarColor = generateRandomColor();
    
    // Hash password
    const hashedPassword = await generatePasswordHash(validatedData.password);
    
    // Create user
    const newUser = await storage.createUser({
      ...validatedData,
      password: hashedPassword,
      initials,
      avatarColor
    });
    
    // Set session
    req.session.userId = newUser.id;
    
    // Return user without password
    const { password, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// User login endpoint
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);
    
    const storage = StorageFactory.getStorage();
    
    // Find user
    const user = await storage.getUserByUsername(validatedData.username);
    if (!user) {
      throw new AppError('Invalid username or password', 401);
    }
    
    // Compare password
    const passwordMatch = await comparePassword(validatedData.password, user.password);
    if (!passwordMatch) {
      throw new AppError('Invalid username or password', 401);
    }
    
    // Set session
    req.session.userId = user.id;
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Get current user endpoint
authRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const storage = StorageFactory.getStorage();
    const user = await storage.getUser(req.session.userId);
    
    if (!user) {
      req.session.userId = undefined;
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Logout endpoint
authRouter.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  try {
    req.session.userId = undefined;
    req.session.destroy((err) => {
      if (err) {
        return next(new AppError('Error logging out', 500));
      }
      res.status(200).json({ message: 'Logged out successfully' });
    });
  } catch (error) {
    next(error);
  }
});

export { authRouter };
