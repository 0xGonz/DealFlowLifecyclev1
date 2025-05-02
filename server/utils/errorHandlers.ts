import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
export const globalErrorHandler = (err: Error | AppError, req: Request, res: Response, next: NextFunction) => {
  // Set default values
  let statusCode = 500;
  let status = 'error';
  let message = 'Something went wrong';
  let stack: string | undefined;

  // If it's our custom AppError, use its properties
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    status = err.status;
    message = err.message;
    // Only include stack trace in development
    stack = process.env.NODE_ENV === 'development' ? err.stack : undefined;
  } else {
    // For other errors, if in development, include more details
    if (process.env.NODE_ENV === 'development') {
      stack = err.stack;
      message = err.message;
    }
  }

  // Handle Zod validation errors (they have a different format)
  if (err.name === 'ZodError') {
    statusCode = 400;
    status = 'fail';
  }

  // Log error in development mode
  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR:', err);
  }

  // Send response
  res.status(statusCode).json({
    status,
    message,
    stack,
    ...(err.name === 'ZodError' && { errors: err }),
  });
};

/**
 * Async handler wrapper to avoid try-catch blocks in route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
