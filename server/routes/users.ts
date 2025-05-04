import { Router, Request, Response } from "express";
import { StorageFactory } from "../storage-factory";
import { hashPassword } from "../utils/auth";
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import * as schema from '@shared/schema';

const router = Router();

// Create user validation schema
const userInsertSchema = createInsertSchema(schema.users, {
  username: z.string().min(3, 'Username must be at least 3 characters long'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'partner', 'analyst', 'observer']),
}).omit({ id: true });

// Create a new user with password hashing
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const userData = userInsertSchema.parse(req.body);
    
    // Check if username already exists
    const storage = StorageFactory.getStorage();
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists' });
    }
    
    // Generate initials from full name
    const nameParts = userData.fullName.split(' ');
    let initials = '';
    if (nameParts.length >= 2) {
      initials = `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`;
    } else if (nameParts.length === 1) {
      initials = nameParts[0].substring(0, 2);
    }
    
    // Generate a random avatar color
    const colors = ['#4f46e5', '#0891b2', '#ea580c', '#be123c', '#7c3aed', '#059669', '#dc2626'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Hash the password
    const hashedPassword = await hashPassword(userData.password);
    
    // Create user with hashed password
    const newUser = await storage.createUser({
      ...userData,
      password: hashedPassword,
      initials,
      avatarColor
    });
    
    // Don't return the password
    const { password, ...userWithoutPassword } = newUser;
    
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Get all users
router.get('/', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.getStorage();
    const users = await storage.getUsers();
    res.json(users.map(user => ({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      initials: user.initials,
      email: user.email,
      role: user.role,
      avatarColor: user.avatarColor
    })));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get a specific user by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.getStorage();
    const user = await storage.getUser(Number(req.params.id));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't send password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Update a user's profile
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const storage = StorageFactory.getStorage();
    
    // Make sure user exists
    const existingUser = await storage.getUser(userId);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Only allow updating safe fields (not password or critical fields)
    const { fullName, role } = req.body;
    const updateData: any = {};
    
    if (fullName) {
      updateData.fullName = fullName;
      
      // Update initials based on the new name
      const nameParts = fullName.split(' ');
      if (nameParts.length >= 2) {
        updateData.initials = `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`;
      } else if (nameParts.length === 1) {
        updateData.initials = nameParts[0].substring(0, 2);
      }
    }
    
    if (role) {
      updateData.role = role;
    }
    
    // Update the user
    const updatedUser = await storage.updateUser(userId, updateData);
    if (!updatedUser) {
      return res.status(500).json({ message: 'Failed to update user' });
    }
    
    // Return the updated user without password
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Change password endpoint
router.post('/:id/change-password', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Current password and new password are required' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'New password must be at least 6 characters long' 
      });
    }
    
    // Get user to verify current password
    const storage = StorageFactory.getStorage();
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify the current password
    let passwordValid = false;
    if (user.password.startsWith('$2b$')) {
      // If the password is hashed, use bcrypt to verify
      const { verifyPassword } = await import('../utils/auth');
      passwordValid = await verifyPassword(currentPassword, user.password);
    } else {
      // Fallback for plain text passwords
      passwordValid = user.password === currentPassword;
    }
    
    if (!passwordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash the new password
    const { hashPassword } = await import('../utils/auth');
    const hashedPassword = await hashPassword(newPassword);
    
    // Update the user with the new password
    const updatedUser = await storage.updateUser(userId, { password: hashedPassword });
    if (!updatedUser) {
      return res.status(500).json({ message: 'Failed to update password' });
    }
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

export default router;