import { Request, Response, NextFunction } from 'express';
import { StorageFactory } from '../storage-factory';
import { AppError } from './errorHandlers';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { User } from '@shared/schema';

// Convert callback-based scrypt to Promise-based
const scryptAsync = promisify(scrypt);

/**
 * Generate a secure password hash using scrypt algorithm
 * 
 * @param password Plain text password to hash
 * @returns Hashed password with salt appended
 */
export async function generatePasswordHash(password: string): Promise<string> {
  // Generate a random salt
  const salt = randomBytes(16).toString('hex');
  
  // Hash the password with the salt
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  
  // Return the hash and salt combined, separated by a dot
  return `${derivedKey.toString('hex')}.${salt}`;
}

/**
 * Verify a password against a stored hash
 * 
 * @param password Plain text password to verify
 * @param storedHash Stored hash from the database (hash.salt format)
 * @returns True if the password matches, false otherwise
 */
export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  // Split the stored hash into the hash and the salt
  const [hash, salt] = storedHash.split('.');
  
  if (!hash || !salt) {
    return false;
  }
  
  // Hash the input password with the same salt
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  
  // Compare the generated hash with the stored hash using constant-time comparison
  // This prevents timing attacks
  return timingSafeEqual(
    Buffer.from(hash, 'hex'),
    derivedKey
  );
}

/**
 * Middleware to check if user is authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return next(new AppError('Authentication required', 401));
  }
  next();
}

/**
 * Middleware to check if user has specific role
 */
export function requireRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return next(new AppError('Authentication required', 401));
    }
    
    try {
      const storage = StorageFactory.getStorage();
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return next(new AppError('User not found', 401));
      }
      
      if (!roles.includes(user.role)) {
        return next(new AppError('Insufficient permissions', 403));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Helper to get current user from session
 */
export async function getCurrentUser(req: Request): Promise<User | null> {
  if (!req.session.userId) {
    return null;
  }
  
  try {
    const storage = StorageFactory.getStorage();
    const user = await storage.getUser(req.session.userId);
    return user || null;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}