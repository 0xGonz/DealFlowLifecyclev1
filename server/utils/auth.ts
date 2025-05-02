import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandlers';
import { StorageFactory } from '../storage-factory';
import { User, InsertUser } from '@shared/schema';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

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

// Login helper
export async function login(req: Request, username: string, password: string) {
  const storage = StorageFactory.getStorage();
  const user = await storage.getUserByUsername(username);
  
  if (!user || !(await verifyPassword(password, user.password))) {
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

// Password utilities
const scryptAsync = promisify(scrypt);

// Hash a password
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${hash.toString('hex')}.${salt}`;
}

// Verify a password against a hash
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const [storedHash, salt] = hashedPassword.split('.');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  const hashBuffer = Buffer.from(storedHash, 'hex');
  return timingSafeEqual(hashBuffer, hash);
}

// Register a new user
export async function register(userData: InsertUser): Promise<User> {
  // Hash the password
  const hashedPassword = await hashPassword(userData.password);
  
  // Create user with hashed password
  const storage = StorageFactory.getStorage();
  const user = await storage.createUser({
    ...userData,
    password: hashedPassword
  });
  
  return user;
}
