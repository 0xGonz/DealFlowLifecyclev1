import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandlers';
import { StorageFactory } from '../storage-factory';

// Promisify the scrypt function for async use
const scryptAsync = promisify(scrypt);

/**
 * Generate a secure hash for a password
 * 
 * @param password Plain text password to hash
 * @returns Hashed password with salt
 */
export async function generatePasswordHash(password: string): Promise<string> {
  // Generate a random salt
  const salt = randomBytes(16).toString('hex');
  
  // Hash the password with the salt
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  
  // Return the hash and salt combined
  return `${buf.toString('hex')}.${salt}`;
}

/**
 * Compare a plain text password with a hashed password
 * 
 * @param suppliedPassword Plain text password to verify
 * @param storedHash Hashed password from database
 * @returns Whether the password matches
 */
export async function comparePassword(suppliedPassword: string, storedHash: string): Promise<boolean> {
  // Extract the hash and salt
  const [hashedPassword, salt] = storedHash.split('.');
  
  // Hash the supplied password with the same salt
  const suppliedBuf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
  
  // Compare the hashes using a timing-safe compare function
  return timingSafeEqual(
    Buffer.from(hashedPassword, 'hex'),
    suppliedBuf
  );
}

/**
 * Middleware to require authentication for protected routes
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return next(new AppError('Not authenticated', 401));
  }
  next();
}

/**
 * Middleware to require specific user roles
 * 
 * @param roles Array of allowed roles
 */
export function requireRoles(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return next(new AppError('Not authenticated', 401));
    }
    
    const storage = StorageFactory.getStorage();
    const user = await storage.getUser(req.session.userId);
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    if (!roles.includes(user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    
    next();
  };
}

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRoles(['admin']);

/**
 * Middleware to require partner role
 */
export const requirePartner = requireRoles(['admin', 'partner']);

/**
 * Middleware to require analyst or higher role
 */
export const requireAnalyst = requireRoles(['admin', 'partner', 'analyst']);
