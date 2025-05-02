import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandlers';
import { StorageFactory } from '../storage-factory';

// Authentication middleware for Passport.js
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return next(new AppError('Authentication required', 401));
  }
  next();
}

// Role-based authorization middleware
export function requireRole(roles: string | string[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return next(new AppError('Authentication required', 401));
    }
    
    const user = req.user;
    if (!user || !user.role || !allowedRoles.includes(user.role)) {
      return next(new AppError('You do not have permission to access this resource', 403));
    }
    
    next();
  };
}

// Helper to get the current user - Passport.js already provides req.user
export function getCurrentUser(req: Request) {
  return req.isAuthenticated() ? req.user : null;
}

// These functions are now handled by Passport.js through our auth.ts implementation
export async function login(req: Request, username: string, password: string) {
  throw new Error('Use Passport authentication instead');
}

export function logout(req: Request) {
  return new Promise<void>((resolve, reject) => {
    req.logout((err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}
