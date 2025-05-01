import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandlers';
import { storage } from '../storage';

// Extended request with user
export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    role: string;
  };
}

/**
 * Authentication middleware for all API routes
 * In a real application, this would verify JWT tokens
 * For now, we're simulating a logged-in user
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  // For MVP, we're not implementing real auth
  // In a real app, this would check JWT tokens, session data, etc.
  // Just simulate a logged-in user
  (req as AuthenticatedRequest).user = { id: 2, role: 'partner' }; // John Doe as default user
  next();
};

/**
 * Authorization middleware for admin-only routes
 */
export const adminRequired = (req: Request, _res: Response, next: NextFunction) => {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user || user.role !== 'admin') {
    return next(new ApiError('Unauthorized: Admin access required', 403));
  }
  
  next();
};

/**
 * Authorization middleware for partner-level or higher routes
 */
export const partnerRequired = (req: Request, _res: Response, next: NextFunction) => {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user || (user.role !== 'partner' && user.role !== 'admin')) {
    return next(new ApiError('Unauthorized: Partner access required', 403));
  }
  
  next();
};

/**
 * Helper to get current user from request
 */
export const getCurrentUser = async (req: Request) => {
  const userId = (req as AuthenticatedRequest).user.id;
  return await storage.getUser(userId);
};
