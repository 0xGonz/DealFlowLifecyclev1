import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { log } from '../vite';

// Custom error class that includes a status code
export class AppError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Format ZodError into a more user-friendly structure
export function formatZodError(error: ZodError) {
  return {
    message: 'Validation error',
    errors: error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message
    }))
  };
}

// Global error handler middleware
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Log the error
  log(`Error: ${err.message}\n${err.stack}`, 'error');
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json(formatZodError(err));
  }
  
  // Handle custom app errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message
    });
  }
  
  // Handle other known error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: err.message
    });
  }
  
  // Default error handling
  const statusCode = (err as any).statusCode || 500;
  const message = statusCode === 500 
    ? 'An unexpected error occurred' 
    : err.message;
  
  return res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

// Async error handling wrapper to avoid try-catch blocks
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Not found error handler
export function notFoundHandler(req: Request, res: Response) {
  return res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}
