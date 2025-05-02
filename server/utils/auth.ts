import { Request, Response, NextFunction } from 'express';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { AppError } from './errorHandlers';

const scryptAsync = promisify(scrypt);

/**
 * Hashes a password using scrypt, returning the hash and salt.
 * 
 * @param password - Plain text password to hash
 * @returns String in format 'hash.salt'
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

/**
 * Compares a supplied password against a stored hashed password.
 * 
 * @param suppliedPassword - Plain text password to check
 * @param storedPassword - Stored password hash in format 'hash.salt'
 * @returns Boolean indicating if the passwords match
 */
export async function comparePasswords(
  suppliedPassword: string,
  storedPassword: string
): Promise<boolean> {
  const [hashedPart, salt] = storedPassword.split('.');
  const hashedSuppliedBuf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
  const storedBuf = Buffer.from(hashedPart, 'hex');
  return timingSafeEqual(storedBuf, hashedSuppliedBuf);
}

/**
 * Middleware to ensure a user is authenticated before accessing a route.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Log information for debugging
  console.log('Session:', req.session);
  console.log('User ID in session:', req.session.userId);
  console.log('User in request:', req.user);
  
  if (!req.session || !req.session.userId) {
    // Clear the session to be safe
    if (req.session) {
      req.session.destroy((err) => {
        if (err) console.error('Error destroying session:', err);
      });
    }
    
    return res.status(401).json({
      status: 'fail',
      message: 'Not authenticated'
    });
  }
  
  // Make sure req.user is populated
  if (!req.user) {
    return res.status(401).json({
      status: 'fail',
      message: 'User not found'
    });
  }
  
  next();
}

/**
 * Middleware to ensure a user has admin role before accessing a route.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      status: 'fail',
      message: 'Not authenticated'
    });
  }
  
  // Make sure req.user is populated
  if (!req.user) {
    return res.status(401).json({
      status: 'fail',
      message: 'User not found'
    });
  }
  
  // Check user has 'admin' role
  const userRole = req.user.role;
  
  if (userRole !== 'admin') {
    return res.status(403).json({
      status: 'fail',
      message: 'You do not have permission to perform this action'
    });
  }
  
  next();
}

/**
 * Middleware to ensure a user has at least one of the specified roles.
 * 
 * @param roles - Array of roles that are allowed to access the route
 * @returns Express middleware function
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        status: 'fail',
        message: 'Not authenticated'
      });
    }
    
    // Make sure req.user is populated
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    // Check user has one of the required roles
    const userRole = req.user.role;
    
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    
    next();
  };
}
