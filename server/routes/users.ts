import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { StorageFactory } from "../storage-factory";
import { AppError } from "../utils/errorHandlers";
import { authMiddleware } from "./auth";

const usersRouter = Router();
const storage = StorageFactory.getStorage();

// Get all users
usersRouter.get("/", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await storage.getUsers();
    
    // Remove password from each user
    const usersWithoutPassword = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.status(200).json(usersWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Get a specific user
usersRouter.get("/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw new AppError("Invalid user ID", 400);
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    
    // Remove password from user
    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Update a user (profile)
usersRouter.patch("/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw new AppError("Invalid user ID", 400);
    }
    
    // Check if user is updating their own profile or is an admin
    if (req.session.userId !== userId && req.user?.role !== "admin") {
      throw new AppError("Unauthorized", 403);
    }
    
    // Validate request body
    const updateSchema = z.object({
      fullName: z.string().min(2, "Full name must be at least 2 characters").optional(),
      email: z.string().email("Invalid email address").optional(),
      role: z.enum(["admin", "partner", "analyst", "observer"]).optional(),
      avatarColor: z.string().nullable().optional(),
    });
    
    const validatedData = updateSchema.parse(req.body);
    
    // Update user
    const updatedUser = await storage.updateUser(userId, validatedData);
    if (!updatedUser) {
      throw new AppError("User not found", 404);
    }
    
    // Remove password from user
    const { password, ...userWithoutPassword } = updatedUser;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

export { usersRouter };
