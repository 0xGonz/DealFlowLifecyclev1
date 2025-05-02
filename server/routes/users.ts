import { Router } from "express";
import { z } from "zod";
import { StorageFactory } from "../storage-factory";
import { AppError } from "../utils/errorHandlers";
import { requireAuth } from "../utils/auth";

const router = Router();
const storage = StorageFactory.getStorage();

// Get all users
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const users = await storage.getUsers();
    
    // Remove password from response
    const usersWithoutPassword = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json(usersWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError("Invalid user ID", 400);
    }

    const user = await storage.getUser(id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Update user
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError("Invalid user ID", 400);
    }

    // Get session user ID
    const sessionUserId = req.session?.userId;
    
    // Check if user is updating their own profile or is an admin
    const sessionUser = sessionUserId ? await storage.getUser(sessionUserId) : null;
    const isOwnProfile = sessionUserId === id;
    const isAdmin = sessionUser?.role === "admin";
    
    if (!isOwnProfile && !isAdmin) {
      throw new AppError("Not authorized to update this user", 403);
    }

    // Validate update data
    const updateSchema = z.object({
      fullName: z.string().optional(),
      email: z.string().email().optional(),
      role: z.enum(["admin", "partner", "analyst", "observer"]).optional(),
      avatarColor: z.string().nullable().optional(),
    });

    const result = updateSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError("Invalid update data", 400, result.error.format());
    }

    // Restrict role changes to admins only
    if (result.data.role && !isAdmin) {
      throw new AppError("Only admins can change roles", 403);
    }

    // Update user
    const updatedUser = await storage.updateUser(id, result.data);
    if (!updatedUser) {
      throw new AppError("User not found", 404);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

export const usersRouter = router;
