import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandlers';
import { StorageFactory } from '../storage-factory';
import * as bcrypt from 'bcrypt';

// Types for session data
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    username?: string;
    role?: string;
  }
}

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return next(new AppError('Authentication required', 401));
  }
  next();
}

// Role-based authorization middleware
export function requireRole(roles: string | string[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return next(new AppError('Authentication required', 401));
    }
    
    if (!req.session.role || !allowedRoles.includes(req.session.role)) {
      return next(new AppError('You do not have permission to access this resource', 403));
    }
    
    next();
  };
}

// Helper to get the current user from the session
export async function getCurrentUser(req: Request) {
  if (!req.session.userId) {
    return null;
  }
  
  try {
    const storage = StorageFactory.getStorage();
    const user = await storage.getUser(req.session.userId);
    return user || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Constants for bcrypt
const SALT_ROUNDS = 10;

// Function to hash a password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Function to verify a password against a hash
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Login helper
export async function login(req: Request, username: string, password: string) {
  const storage = StorageFactory.getStorage();
  const user = await storage.getUserByUsername(username);
  
  if (!user) {
    throw new AppError('Invalid username or password', 401);
  }
  
  // Check if the password is hashed by seeing if it starts with $2b$ (bcrypt identifier)
  let passwordValid = false;
  if (user.password.startsWith('$2b$')) {
    // If the password is hashed, use bcrypt to verify
    passwordValid = await verifyPassword(password, user.password);
  } else {
    // Fallback for plain text passwords during transition
    // This allows old accounts to still log in
    passwordValid = user.password === password;
    
    // Optionally hash the password for next time if it matches
    if (passwordValid) {
      // Update the user's password hash in the database
      const hashedPassword = await hashPassword(password);
      await storage.updateUser(user.id, { password: hashedPassword });
      console.log(`Upgraded password hash for user ${username}`);
    }
  }
  
  if (!passwordValid) {
    throw new AppError('Invalid username or password', 401);
  }
  
  // Set session data
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;
  
  return user;
}

// Logout helper
export function logout(req: Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

// Register user helper
export async function registerUser(req: Request, userData: any) {
  const storage = StorageFactory.getStorage();
  
  // Check if the username already exists
  const existingUser = await storage.getUserByUsername(userData.username);
  if (existingUser) {
    throw new AppError('Username already exists', 400);
  }
  
  // Check if the email already exists
  const users = await storage.getUsers();
  const existingEmail = users.find(u => u.email === userData.email);
  if (existingEmail) {
    throw new AppError('Email already exists', 400);
  }
  
  // Hash the password
  const hashedPassword = await hashPassword(userData.password);
  
  // Create the user with hashed password
  const newUser = await storage.createUser({
    ...userData,
    password: hashedPassword,
  });
  
  // Set session data (auto-login)
  req.session.userId = newUser.id;
  req.session.username = newUser.username;
  req.session.role = newUser.role;
  
  return newUser;
}
