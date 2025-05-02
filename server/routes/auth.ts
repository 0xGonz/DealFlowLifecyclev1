import { Request, Response, Router } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { StorageFactory } from "../storage-factory";
import { z } from "zod";

const scryptAsync = promisify(scrypt);

// Create validation schemas
const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const registerSchema = z.object({
  username: z.string().min(3),
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const profileUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "partner", "analyst", "observer"]).optional(),
  avatarColor: z.string().nullable().optional(),
});

// Helper functions for password hashing
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export const authRouter = Router();

// Login route
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const { username, password } = result.data;
    const storage = StorageFactory.getStorage();
    const user = await storage.getUserByUsername(username);

    if (!user || !(await comparePasswords(password, user.password))) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Store user in session
    req.session.userId = user.id;
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Register route
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const { username, fullName, email, password } = result.data;
    const storage = StorageFactory.getStorage();

    // Check if username already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Generate initials from full name
    const initials = fullName
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    // Create user
    const hashedPassword = await hashPassword(password);
    const user = await storage.createUser({
      username,
      password: hashedPassword,
      fullName,
      email,
      initials,
      role: "analyst", // Default role
      avatarColor: null, // Will generate default color based on ID
    });

    // Store user in session
    req.session.userId = user.id;

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Logout route
authRouter.post("/logout", (req: Request, res: Response) => {
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Error logging out" });
    }
    res.clearCookie("connect.sid");
    return res.status(200).json({ message: "Logged out successfully" });
  });
});

// Get current user
authRouter.get("/me", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const storage = StorageFactory.getStorage();
    const user = await storage.getUser(req.session.userId);

    if (!user) {
      // User not found or session refers to deleted user
      req.session.destroy(() => {});
      return res.status(401).json({ message: "User not found" });
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
