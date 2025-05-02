import { Request, Response, Router } from "express";
import { StorageFactory } from "../storage-factory";
import { z } from "zod";

// Create validation schema for profile updates
const profileUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "partner", "analyst", "observer"]).optional(),
  avatarColor: z.string().nullable().optional(),
});

export const usersRouter = Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
};

// Get all users
usersRouter.get("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.getStorage();
    const users = await storage.getUsers();

    // Return users without password
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return res.status(200).json(usersWithoutPasswords);
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get user by ID
usersRouter.get("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const storage = StorageFactory.getStorage();
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Update user profile
usersRouter.patch("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Check if user is updating their own profile or is an admin
    if (req.session.userId !== userId) {
      return res.status(403).json({ message: "You are not authorized to update this profile" });
    }

    const result = profileUpdateSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid request data", errors: result.error.errors });
    }

    const storage = StorageFactory.getStorage();

    // Check if user exists
    const existingUser = await storage.getUser(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user
    const updatedUser = await storage.updateUser(userId, result.data);

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user without password
    const { password, ...userWithoutPassword } = updatedUser;
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
