import { Router, Request, Response } from "express";
import { StorageFactory } from "../storage-factory";

const router = Router();

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

export default router;