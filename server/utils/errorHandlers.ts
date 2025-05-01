import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Centralized error handling utility for consistent API responses
 */
export const handleApiError = (error: any, res: Response): void => {
  console.error('API Error:', error);
  
  if (error instanceof ZodError) {
    res.status(400).json({ 
      message: 'Validation error', 
      errors: error.errors 
    });
    return;
  }
  
  if (error.name === 'NotFoundError') {
    res.status(404).json({ message: error.message || 'Resource not found' });
    return;
  }
  
  res.status(error.status || error.statusCode || 500).json({ 
    message: error.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}) 
  });
};

/**
 * Global error handler middleware for Express
 */
export const errorHandlerMiddleware = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  handleApiError(err, res);
};

/**
 * Creates a custom error with status code
 */
export class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/**
 * Not found error
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Async route handler that catches errors and forwards to next
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
