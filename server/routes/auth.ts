import { Router } from 'express';
import { z } from 'zod';
import { StorageFactory } from '../storage-factory';
import { asyncHandler } from '../utils/errorHandlers';
import { hashPassword, comparePasswords } from '../utils/auth';
import { generateInitials } from '../utils/string';

const storage = StorageFactory.getStorage();
const authRouter = Router();

// Auth validation schemas
const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  role: z.enum(['admin', 'partner', 'analyst', 'observer']).optional().default('analyst'),
});

// User registration
authRouter.post('/register', asyncHandler(async (req, res) => {
  const validatedData = registerSchema.parse(req.body);
  
  // Check if username already exists
  const existingUserByUsername = await storage.getUserByUsername(validatedData.username);
  if (existingUserByUsername) {
    return res.status(400).json({
      status: 'fail',
      message: 'Username already exists'
    });
  }
  
  // Check if email already exists
  const existingUserByEmail = await storage.getUserByEmail(validatedData.email);
  if (existingUserByEmail) {
    return res.status(400).json({
      status: 'fail',
      message: 'Email already exists'
    });
  }
  
  // Create new user with hashed password
  const hashedPassword = await hashPassword(validatedData.password);
  const initials = generateInitials(validatedData.fullName);
  
  const newUser = await storage.createUser({
    ...validatedData,
    password: hashedPassword,
    initials,
    avatarColor: null, // Default avatar color, user can customize later
    role: validatedData.role || 'analyst', // Default role
  });
  
  // Store user ID in session
  req.session.userId = newUser.id;
  
  // Send user data without password
  const { password, ...userWithoutPassword } = newUser;
  res.status(201).json(userWithoutPassword);
}));

// User login
authRouter.post('/login', asyncHandler(async (req, res) => {
  const { identifier, password } = loginSchema.parse(req.body);
  
  // Check if identifier is username or email
  let user = await storage.getUserByUsername(identifier);
  if (!user) {
    user = await storage.getUserByEmail(identifier);
  }
  
  // If no user or password doesn't match
  if (!user || !(await comparePasswords(password, user.password))) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid credentials'
    });
  }
  
  // Store user ID in session
  req.session.userId = user.id;
  
  // Send user data without password
  const { password: userPassword, ...userWithoutPassword } = user;
  res.status(200).json(userWithoutPassword);
}));

// User logout
authRouter.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        status: 'error',
        message: 'Could not log out'
      });
    }
    res.clearCookie('connect.sid'); // Clear session cookie
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  });
});

// Get current user data
authRouter.get('/me', asyncHandler(async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      status: 'fail',
      message: 'Not authenticated'
    });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user) {
    req.session.destroy(() => {}); // Destroy invalid session
    return res.status(401).json({
      status: 'fail',
      message: 'User not found'
    });
  }
  
  // Send user data without password
  const { password, ...userWithoutPassword } = user;
  res.status(200).json(userWithoutPassword);
}));

export { authRouter };
