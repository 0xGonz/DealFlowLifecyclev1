import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async controller functions to properly handle promises and catch errors
 * without having to use try/catch in every route handler.
 * 
 * @param fn - Async express route handler function
 * @returns Express handler with error handling
 */
export const asyncHandler = 
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * Handles 404 Not Found errors for routes that don't exist.
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    status: 'fail',
    message: `Cannot find ${req.method} ${req.originalUrl} on this server`,
  });
};

/**
 * Global error handler for all uncaught errors in the application.
 */
export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Default to 500 internal server error unless specified
  const statusCode = err.statusCode || 500;
  
  // Log error for server debugging
  console.error('Error:', err);
  
  // Send appropriate response in production or development
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Something went wrong',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

/**
 * Custom error class with status code for API errors.
 */
export class AppError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}
