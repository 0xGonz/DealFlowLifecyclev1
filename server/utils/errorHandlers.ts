import { Request, Response, NextFunction } from "express";

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
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle invalid JSON body errors
 */
export const handleJSONError = (err: any) => {
  const message = "Invalid JSON: Please check your request format";
  return new AppError(message, 400);
};

/**
 * Handle validation errors from Zod
 */
export const handleZodError = (err: any) => {
  const message = err.issues
    ? err.issues.map((issue: any) => `${issue.path.join(".")} - ${issue.message}`).join("; ")
    : "Validation error";
  return new AppError(message, 400);
};

/**
 * Handle other generic errors
 */
export const handleGenericError = (err: any) => {
  // Duplicate key errors from database
  if (err.code === "23505") {
    const field = err.detail.match(/\(([^)]+)\)/)?.[1] || "field";
    return new AppError(`${field} already exists`, 400);
  }
  
  // Other DB errors
  if (err.code && err.code.startsWith("22") || err.code.startsWith("23")) {
    return new AppError("Database error: Invalid input", 400);
  }
  
  return err;
};

/**
 * Global error handler middleware
 */
export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log the error stack in development
  console.error("ERROR:", err);
  
  // Handle specific error types
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  
  // Invalid JSON
  if (error.type === "entity.parse.failed") {
    error = handleJSONError(error);
  }
  
  // Zod validation errors
  if (error.name === "ZodError") {
    error = handleZodError(error);
  }
  
  // Handle other errors
  error = handleGenericError(error);
  
  // Send error response
  const statusCode = error.statusCode || 500;
  const status = error.status || "error";
  const message = error.message || "Something went wrong";
  
  res.status(statusCode).json({
    status,
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
};
