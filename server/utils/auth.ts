import { Request, Response, NextFunction } from "express";
import { StorageFactory } from "../storage-factory";
import { AppError } from "./errorHandlers";
import * as crypto from "crypto";
import { User } from "@shared/schema";

// Extend Express Request with user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Generate a password hash using scrypt
 * @param password The plain text password
 * @returns The hashed password with salt
 */
export async function generatePasswordHash(password: string): Promise<string> {
  // Generate a random salt
  const salt = crypto.randomBytes(16).toString("hex");
  
  // Hash the password with the salt
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${derivedKey.toString("hex")}.${salt}`);
    });
  });
}

/**
 * Compare a plain text password with a hashed password
 * @param password The plain text password
 * @param hashedPassword The hashed password with salt
 * @returns Whether the passwords match
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Extract the salt from the hashed password
    const [hash, salt] = hashedPassword.split(".");
    
    // Hash the provided password with the same salt
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      
      // Compare the hashes in constant time to prevent timing attacks
      resolve(crypto.timingSafeEqual(
        Buffer.from(hash, "hex"),
        derivedKey
      ));
    });
  });
}

/**
 * Middleware to check if user is authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({
      status: "fail",
      message: "Not authenticated",
    });
  }
  next();
}

/**
 * Middleware to check if user is an admin
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({
      status: "fail",
      message: "Not authenticated",
    });
  }
  
  const storage = StorageFactory.getStorage();
  const user = await storage.getUser(req.session.userId);
  
  if (!user || user.role !== "admin") {
    return res.status(403).json({
      status: "fail",
      message: "Forbidden: Admin access required",
    });
  }
  
  // Make the user available on the request
  req.user = user;
  next();
}

/**
 * Generate a random password
 * @param length The length of the password
 * @returns A random password
 */
export function generateRandomPassword(length: number = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
  let password = "";
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}
