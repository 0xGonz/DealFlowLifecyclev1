import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandlers';
import { StorageFactory } from '../storage-factory';
import * as bcrypt from 'bcrypt';
import { SALT_ROUNDS, AUTH_ERRORS } from '../constants/auth-constants';

// Types for session data
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    username?: string;
    role?: string;
  }
}

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return next(new AppError(AUTH_ERRORS.AUTH_REQUIRED, 401));
  }
  next();
}

// Role-based authorization middleware
export function requireRole(roles: string | string[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return next(new AppError(AUTH_ERRORS.AUTH_REQUIRED, 401));
    }
    
    if (!req.session.role || !allowedRoles.includes(req.session.role)) {
      return next(new AppError(AUTH_ERRORS.PERMISSION_DENIED, 403));
    }
    
    next();
  };
}

// Helper to get the current user from the session
export async function getCurrentUser(req: Request) {
  if (!req.session || !req.session.userId) {
    console.log('No userId in session, user is not authenticated');
    return null;
  }
  
  console.log(`Getting current user from session with userId: ${req.session.userId}`);
  
  try {
    const storage = StorageFactory.getStorage();
    const user = await storage.getUser(req.session.userId);
    
    if (!user) {
      console.error(`User with ID ${req.session.userId} not found in database but was in session`);
      // Session refers to a user that doesn't exist in the database
      // This is an inconsistent state - we should destroy the session
      await new Promise<void>((resolve) => {
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying invalid session:', err);
          }
          resolve();
        });
      });
      return null;
    }
    
    console.log(`Found current user: ${user.username} (ID: ${user.id}, Role: ${user.role})`);
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Function to hash a password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Function to verify a password against a hash
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Login helper
export async function login(req: Request, username: string, password: string) {
  try {
    console.log(`Auth login helper called for username: ${username}`);
    
    // Clear any existing session first to avoid conflicts
    await new Promise<void>((resolve) => {
      if (req.session?.userId) {
        console.log(`Clearing existing session for userId: ${req.session.userId} before login`);
        req.session.destroy((err) => {
          if (err) console.error('Error clearing existing session before login:', err);
          resolve();
        });
      } else {
        resolve();
      }
    });
    
    const storage = StorageFactory.getStorage();
    const user = await storage.getUserByUsername(username);
    
    if (!user) {
      console.error(`User ${username} not found in database`);
      throw new AppError(AUTH_ERRORS.INVALID_CREDENTIALS, 401);
    }
    
    console.log(`User ${username} found, checking password`);
    
    // Check if the password is hashed by seeing if it starts with $2b$ (bcrypt identifier)
    let passwordValid = false;
    if (user.password.startsWith('$2b$')) {
      // If the password is hashed, use bcrypt to verify
      passwordValid = await verifyPassword(password, user.password);
      console.log(`Password verified with bcrypt for ${username}: ${passwordValid}`);
    } else {
      // Fallback for plain text passwords during transition
      // This allows old accounts to still log in
      passwordValid = user.password === password;
      console.log(`Password verified with plain text for ${username}: ${passwordValid}`);
      
      // Optionally hash the password for next time if it matches
      if (passwordValid) {
        // Update the user's password hash in the database
        const hashedPassword = await hashPassword(password);
        await storage.updateUser(user.id, { password: hashedPassword });
        console.log(`Upgraded password hash for user ${username}`);
      }
    }
    
    if (!passwordValid) {
      console.error(`Invalid password for user ${username}`);
      throw new AppError(AUTH_ERRORS.INVALID_CREDENTIALS, 401);
    }
    
    // Set session data in a new session
    console.log(`Setting session data for user ${username}:`, { id: user.id, role: user.role });
    
    // Generate a new session and wait for it to be ready before setting data
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) {
          console.error('Error regenerating session:', err);
          return reject(err);
        }
        resolve();
      });
    });
    
    console.log(`New session generated for ${username}, setting user data`);
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    
    // Make sure data is saved to session store
    await new Promise<void>((resolve, reject) => {
      req.session.save(err => {
        if (err) {
          console.error('Session save error:', err);
          return reject(err);
        }
        console.log(`Session saved successfully for ${username}`);
        
        // Double check that the session was actually saved
        if (!req.session.userId) {
          console.error('Session data not set after save. This could indicate a session store problem.');
          return reject(new Error('Session data not set after save'));
        }
        
        console.log('Verified session data is present after save:', { 
          userId: req.session.userId,
          username: req.session.username,
          role: req.session.role 
        });
        
        resolve();
      });
    });
    
    return user;
  } catch (error) {
    console.error('Login helper error:', error);
    throw error;
  }
}

// Logout helper
export function logout(req: Request) {
  console.log('Logout helper called');
  
  if (!req.session || !req.session.userId) {
    console.log('No active session to logout from');
    return Promise.resolve();
  }
  
  console.log(`Destroying session for user: ${req.session.username}, ID: ${req.session.userId}`);
  
  return new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return reject(err);
      }
      console.log('Session successfully destroyed');
      resolve();
    });
  });
}

// Register user helper
export async function registerUser(req: Request, userData: any) {
  try {
    console.log(`Register user helper called for username: ${userData.username}`);
    
    // Clear any existing session first to avoid conflicts
    await new Promise<void>((resolve) => {
      if (req.session?.userId) {
        console.log(`Clearing existing session for userId: ${req.session.userId} before registration`);
        req.session.destroy((err) => {
          if (err) console.error('Error clearing existing session before registration:', err);
          resolve();
        });
      } else {
        resolve();
      }
    });
    
    const storage = StorageFactory.getStorage();
    
    // Check if the username already exists
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      console.error(`Username already exists: ${userData.username}`);
      throw new AppError(AUTH_ERRORS.USERNAME_EXISTS, 400);
    }
    
    // Check if the email already exists
    const users = await storage.getUsers();
    const existingEmail = users.find(u => u.email === userData.email);
    if (existingEmail) {
      console.error(`Email already exists: ${userData.email}`);
      throw new AppError(AUTH_ERRORS.EMAIL_EXISTS, 400);
    }
    
    // Hash the password
    console.log('Hashing password for new user');
    const hashedPassword = await hashPassword(userData.password);
    
    // Create the user with hashed password
    console.log('Creating new user with hashed password');
    const newUser = await storage.createUser({
      ...userData,
      password: hashedPassword,
    });
    
    // Set session data in a new session
    console.log(`Setting session data for new user ${userData.username}:`, { id: newUser.id, role: newUser.role });
    
    // Generate a new session and wait for it to be ready before setting data
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) {
          console.error('Error regenerating session during registration:', err);
          return reject(err);
        }
        resolve();
      });
    });
    
    console.log(`New session generated for new user ${userData.username}, setting user data`);
    req.session.userId = newUser.id;
    req.session.username = newUser.username;
    req.session.role = newUser.role;
    
    // Make sure data is saved to session store
    await new Promise<void>((resolve, reject) => {
      req.session.save(err => {
        if (err) {
          console.error('Session save error during registration:', err);
          return reject(err);
        }
        
        console.log(`Session saved successfully for new user ${userData.username}`);
        
        // Double check that the session was actually saved
        if (!req.session.userId) {
          console.error('Session data not set after save during registration. This could indicate a session store problem.');
          return reject(new Error('Session data not set after save during registration'));
        }
        
        console.log('Verified session data is present after registration save:', { 
          userId: req.session.userId,
          username: req.session.username,
          role: req.session.role 
        });
        
        resolve();
      });
    });
    
    return newUser;
  } catch (error) {
    console.error('Register user helper error:', error);
    throw error;
  }
}
