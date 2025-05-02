import { Request, Response, NextFunction } from 'express';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { AppError } from './errorHandlers';

// Convert callback-based scrypt to Promise-based
const scryptAsync = promisify(scrypt);

/**
 * Hash a password using scrypt with a random salt
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate random salt
  const salt = randomBytes(16).toString('hex');
  
  // Hash the password with the salt
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  
  // Return the hashed password with salt for storage
  // Format: [hash].[salt]
  return `${derivedKey.toString('hex')}.${salt}`;
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
  // Split the stored hash into derived key and salt
  const [storedHash, salt] = hashedPassword.split('.');
  
  // Hash the input password with the same salt
  const derivedKey = await scryptAsync(plainPassword, salt, 64) as Buffer;
  
  // Compare the generated hash with the stored hash
  return derivedKey.toString('hex') === storedHash;
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return next(new AppError('Not authenticated', 401));
  }
  next();
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // First check if authenticated
  if (!req.session.userId) {
    return next(new AppError('Not authenticated', 401));
  }
  
  // Check if user has admin role (would require user in request)
  // This is a placeholder - implementation will depend on how user data is stored
  if (req.user?.role !== 'admin') {
    return next(new AppError('Access denied. Admin privileges required.', 403));
  }
  
  next();
}

/**
 * Middleware to require partner or admin role
 */
export function requirePartner(req: Request, res: Response, next: NextFunction) {
  // First check if authenticated
  if (!req.session.userId) {
    return next(new AppError('Not authenticated', 401));
  }
  
  // Check if user has partner or admin role
  if (req.user?.role !== 'partner' && req.user?.role !== 'admin') {
    return next(new AppError('Access denied. Partner privileges required.', 403));
  }
  
  next();
}
