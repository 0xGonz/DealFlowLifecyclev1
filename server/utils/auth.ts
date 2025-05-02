import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { promisify } from "util";
import { AppError } from "./errorHandlers";

// Promisify crypto functions
const scrypt = promisify(crypto.scrypt);

/**
 * Generate a secure password hash with salt
 * @param password The plain text password
 * @returns The hashed password with salt
 */
export async function generatePasswordHash(password: string): Promise<string> {
  // Generate a random salt
  const salt = crypto.randomBytes(16).toString("hex");
  
  // Hash the password with the salt
  const derivedKey = await scrypt(password, salt, 64) as Buffer;
  
  // Combine the hash and salt with a separator
  return `${derivedKey.toString("hex")}.${salt}`;
}

/**
 * Compare a plain text password with a hashed password
 * @param plainPassword The plain text password to check
 * @param hashedPassword The hashed password to compare against
 * @returns True if the passwords match, false otherwise
 */
export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  // Split the hashed password to get the hash and salt
  const [hash, salt] = hashedPassword.split(".");
  
  // If we don't have both parts, the format is invalid
  if (!hash || !salt) return false;
  
  // Hash the plain password with the same salt
  const derivedKey = await scrypt(plainPassword, salt, 64) as Buffer;
  
  // Compare the hashes
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    derivedKey
  );
}

/**
 * Middleware to require authentication for a route
 * @param req The Express request object
 * @param res The Express response object
 * @param next The next middleware function
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check if the user is logged in (has a user ID in the session)
  if (!req.session?.userId) {
    return next(new AppError("Not authenticated", 401));
  }
  
  // User is authenticated, proceed to the next middleware or route handler
  next();
}

/**
 * Middleware to require admin role for a route
 * @param req The Express request object
 * @param res The Express response object
 * @param next The next middleware function
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // First check if the user is authenticated
  if (!req.session?.userId) {
    return next(new AppError("Not authenticated", 401));
  }
  
  // Check if the user has the admin role (requires user to be loaded)
  if (req.user?.role !== "admin") {
    return next(new AppError("Admin privileges required", 403));
  }
  
  // User is authenticated and has admin role, proceed
  next();
}
