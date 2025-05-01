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

export default router;