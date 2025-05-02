import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { User } from "@shared/schema";
import { StorageFactory } from "../storage-factory";
import { AppError } from "../utils/errorHandlers";
import { generatePasswordHash, comparePassword } from "../utils/auth";
import { getInitials } from "../utils/string";

const authRouter = Router();
const storage = StorageFactory.getStorage();

// Extend the Express Request type to include user properties
declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, "password">;
    }
  }
}

// Register a new user
authRouter.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const registerSchema = z.object({
      username: z.string().min(3, "Username must be at least 3 characters"),
      fullName: z.string().min(2, "Full name is required"),
      email: z.string().email("Invalid email address"),
      password: z.string().min(6, "Password must be at least 6 characters"),
    });

    const validatedData = registerSchema.parse(req.body);

    // Check if username already exists
    const existingUser = await storage.getUserByUsername(validatedData.username);
    if (existingUser) {
      throw new AppError("Username already exists", 400);
    }

    // Hash password
    const hashedPassword = await generatePasswordHash(validatedData.password);

    // Generate initials from full name
    const initials = getInitials(validatedData.fullName);

    // Create new user
    const newUser = await storage.createUser({
      username: validatedData.username,
      fullName: validatedData.fullName,
      email: validatedData.email,
      password: hashedPassword,
      initials,
      role: "analyst", // Default role
      avatarColor: null, // No color preference by default
    });

    // Set user ID in session
    req.session.userId = newUser.id;

    // Return user data without password
    const { password, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Login user
authRouter.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const loginSchema = z.object({
      username: z.string().min(1, "Username is required"),
      password: z.string().min(1, "Password is required"),
    });

    const validatedData = loginSchema.parse(req.body);

    // Find user by username
    const user = await storage.getUserByUsername(validatedData.username);
    if (!user) {
      throw new AppError("Invalid username or password", 401);
    }

    // Verify password
    const isPasswordValid = await comparePassword(validatedData.password, user.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid username or password", 401);
    }

    // Set user ID in session
    req.session.userId = user.id;

    // Return user data without password
    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Logout user
authRouter.post("/logout", (req: Request, res: Response, next: NextFunction) => {
  try {
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        return next(new AppError("Failed to logout", 500));
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
authRouter.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Get user from storage
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      // If user was deleted but still had a session
      req.session.destroy(() => {});
      return res.status(401).json({ message: "User not found" });
    }

    // Return user data without password
    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// User authentication middleware for use in other routes
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return next(new AppError("Not authenticated", 401));
    }

    // Get user from storage
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return next(new AppError("User not found", 401));
    }

    // Attach user to request object (without password)
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword as Omit<User, "password">;

    next();
  } catch (error) {
    next(error);
  }
};

export { authRouter };
