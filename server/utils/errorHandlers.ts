import { Request, Response, NextFunction } from "express";

/**
 * Custom application error class
 */
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  errors?: any;

  constructor(message: string, statusCode: number, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.errors = errors;

    // Capture the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
export function globalErrorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Default error status code and message
  let statusCode = 500;
  let status = "error";
  let message = "Something went wrong";
  let errors = undefined;

  // If it's our custom AppError, use its properties
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    status = err.status;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof Error) {
    // For standard Error objects, use the message if available
    message = err.message || message;
  }

  // Set the response with appropriate status code and error details
  res.status(statusCode).json({
    status,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}
