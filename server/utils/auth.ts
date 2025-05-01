import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandlers';
import { storage } from '../storage';

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
    const user = await storage.getUser(req.session.userId);
    return user || null;
  } catch (error) {
    return null;
  }
}

// Login helper
export async function login(req: Request, username: string, password: string) {
  const user = await storage.getUserByUsername(username);
  
  if (!user || user.password !== password) { // In production, use proper password hashing
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
