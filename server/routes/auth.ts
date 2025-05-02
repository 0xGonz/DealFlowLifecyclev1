import { Router } from "express";
import { z } from "zod";
import { User, insertUserSchema } from "@shared/schema";
import { StorageFactory } from "../storage-factory";
import { AppError } from "../utils/errorHandlers";
import { generatePasswordHash, comparePassword } from "../utils/auth";
import { generateInitials } from "../utils/string";

const router = Router();
const storage = StorageFactory.getStorage();

// Register new user
router.post("/register", async (req, res, next) => {
  try {
    // Validate request body
    const userSchema = insertUserSchema.extend({
      // Add confirmPassword field for validation
      confirmPassword: z.string().optional(),
    });

    const result = userSchema.safeParse(req.body);
    
    if (!result.success) {
      throw new AppError("Invalid user data", 400, result.error.format());
    }

    // Extract validated data
    const { password, confirmPassword, ...userData } = result.data;

    // Confirm passwords match if confirmPassword is provided
    if (confirmPassword && password !== confirmPassword) {
      throw new AppError("Passwords do not match", 400);
    }

    // Check if username already exists
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      throw new AppError("Username already exists", 400);
    }

    // Generate initials from full name
    const initials = generateInitials(userData.fullName);

    // Hash password
    const hashedPassword = await generatePasswordHash(password);

    // Create user with hashed password
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword,
      initials,
      role: userData.role || "analyst",
    });

    // Set user in session
    if (req.session) {
      req.session.userId = user.id;
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Login user
router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new AppError("Username and password are required", 400);
    }

    // Find user by username
    const user = await storage.getUserByUsername(username);
    if (!user) {
      throw new AppError("Invalid username or password", 401);
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid username or password", 401);
    }

    // Set user in session
    if (req.session) {
      req.session.userId = user.id;
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Logout user
router.post("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ message: "Failed to logout" });
      } else {
        res.clearCookie("connect.sid"); // Clear session cookie
        res.status(200).json({ message: "Logged out successfully" });
      }
    });
  } else {
    res.status(200).json({ message: "No active session" });
  }
});

// Get current user
router.get("/me", async (req, res, next) => {
  try {
    if (!req.session?.userId) {
      throw new AppError("Not authenticated", 401);
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      if (req.session) {
        req.session.destroy(() => {});
      }
      throw new AppError("User not found", 404);
    }

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

export const authRouter = router;
