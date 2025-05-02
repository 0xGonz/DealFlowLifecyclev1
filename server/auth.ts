import { Express, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { StorageFactory } from './storage-factory';
import { User } from '@shared/schema';

// Extend the session interface to include our custom properties
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: 'Not authenticated' });
}

// Setup authentication for the app
export function setupAuth(app: Express) {
  const storage = StorageFactory.getStorage();
  const sessionSecret = process.env.SESSION_SECRET || 'development-secret-key';
  
  const sessionOptions: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    store: storage.sessionStore
  };

  app.use(session(sessionOptions));

  // Get current user middleware
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.session && req.session.userId) {
      try {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          (req as any).user = user;
        }
      } catch (err) {
        console.error('Error loading user from session:', err);
      }
    }
    next();
  });
  
  // Register API endpoints for authentication
  
  // Register user
  app.post('/api/register', async (req, res) => {
    try {
      console.log('Register API called with:', req.body);
      const { username, password, fullName, email, role, initials, avatarColor } = req.body;

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        fullName,
        email,
        role: role || 'analyst',
        initials: initials || username.substring(0, 2).toUpperCase(),
        avatarColor: avatarColor || '#0E4DA4',
      });

      // Start session
      req.session.userId = user.id;

      // Return user without password
      const { password: _password, ...userWithoutPassword } = user;
      console.log('User registered successfully:', userWithoutPassword);
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Failed to register user' });
    }
  });

  // Login user
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Find the user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Check password
      const isValidPassword = await comparePasswords(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Set session
      req.session.userId = user.id;
      
      // Return user without password
      const { password: _password, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'An error occurred during login' });
    }
  });

  // Logout user
  app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to logout' });
      }
      return res.status(200).json({ message: 'Logged out successfully' });
    });
  });

  // Get current user
  app.get('/api/me', (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // If we have the user object from the middleware
    if ((req as any).user) {
      const { password: _password, ...userWithoutPassword } = (req as any).user;
      return res.json(userWithoutPassword);
    }
    
    return res.status(401).json({ message: 'User not found' });
  });
}
