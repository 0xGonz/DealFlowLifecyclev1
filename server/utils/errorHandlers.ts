import { Request, Response, NextFunction } from 'express';

/**
 * Custom application error class for operational errors
 */
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = true;

    // Capture stack trace (exclude error creation from trace)
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async handler to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Global error handler middleware for express
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Default to 500 if statusCode not defined
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Development environment: send detailed error
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  }

  // Production environment: only send operational errors as-is
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Programming or unknown errors: don't leak error details
  console.error('ERROR 💥', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong',
  });
};
