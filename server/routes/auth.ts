import { Router, Request, Response } from "express";
import { storage } from "../storage";

const router = Router();

// Auth routes (simplified for MVP)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }
    
    const user = await storage.getUserByUsername(username);
    
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // In a real app, you'd create a JWT token here
    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
      user: userWithoutPassword,
      token: 'fake-jwt-token'
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});

export default router;