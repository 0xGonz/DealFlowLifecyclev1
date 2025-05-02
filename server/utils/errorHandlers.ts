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
  // Default error status and message
  let statusCode = 500;
  let message = 'Something went wrong';
  let stack: string | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Error) {
    message = err.message;
  }

  // Include stack trace in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    stack = err.stack;
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(stack && { stack }),
  });
};

/**
 * Async handler wrapper to avoid try-catch blocks in route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
