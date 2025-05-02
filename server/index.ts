import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// We don't need to import errorHandlers here since it's used in routes.ts
import { pool } from "./db";
import { StorageFactory } from "./storage-factory";

// Add user property to session
declare module 'express-session' {
  interface Session {
    userId?: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: any; // Using any for simplicity
    }
  }
}

const app = express();

// Configure CORS
app.use(cors({
  origin: true, // Allows requests from any origin in development; should be restricted in production
  credentials: true, // Important: allow cookies to be sent with requests
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure session middleware with memory store (for now)
app.use(session({
  secret: process.env.SESSION_SECRET || 'investment-tracker-secret',
  resave: true, // Changed to true to ensure session is saved on every request
  saveUninitialized: true, // Changed to true to save uninitialized sessions
  name: 'investment_session', // Give a consistent name to the session cookie
  cookie: {
    secure: false, // Set to false since we're not using HTTPS
    httpOnly: true, // Only accessible through HTTP
    maxAge: 24 * 60 * 60 * 1000, // 24 hours 
    sameSite: 'lax', // Allow cross-site requests
    path: '/' // Cookie is valid for all paths
  }
}));

// User deserialization middleware - must come after session middleware
app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.userId) {
    try {
      const storage = StorageFactory.getStorage();
      const user = await storage.getUser(req.session.userId);
      if (user) {
        // Don't include password in req.user
        const { password, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;
      } else {
        // User no longer exists, clean up session
        delete req.session.userId;
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  }
  next();
});

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // We're using in-memory session store for now to simplify setup
  
  const server = await registerRoutes(app);

  // Error handling is centralized in routes.ts

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
