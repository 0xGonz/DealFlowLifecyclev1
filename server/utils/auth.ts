import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { AppError } from './errorHandlers';
import { StorageFactory } from '../storage-factory';

/**
 * Generate a secure hash for a password
 * 
 * @param password Plain text password to hash
 * @returns Hashed password with salt
 */
export async function generatePasswordHash(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Generate random salt
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Hash the password with the salt using scrypt (more secure than bcrypt)
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      
      // Format: hash.salt
      resolve(`${derivedKey.toString('hex')}.${salt}`);
    });
  });
}

/**
 * Compare a plain text password with a hashed password
 * 
 * @param suppliedPassword Plain text password to verify
 * @param storedHash Hashed password from database
 * @returns Whether the password matches
 */
export async function comparePassword(suppliedPassword: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Split hash and salt
    const [hash, salt] = storedHash.split('.');
    
    if (!hash || !salt) {
      return resolve(false); // Invalid stored hash format
    }
    
    // Hash the supplied password with the same salt
    crypto.scrypt(suppliedPassword, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      
      // Compare the generated hash with the stored hash
      resolve(crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        derivedKey
      ));
    });
  });
}

/**
 * Middleware to require authentication for protected routes
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return next(new AppError('Authentication required', 401));
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
      return next(new AppError('Authentication required', 401));
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
