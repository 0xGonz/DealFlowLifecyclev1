import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { errorHandler } from "./utils/errorHandlers";
import { pool } from "./db";
import * as fs from 'fs';
import * as path from 'path';
import connectPgSimple from 'connect-pg-simple';
import memorystore from 'memorystore';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Create a memory store as a fallback option
const MemoryStore = memorystore(session);
const memorySessionStore = new MemoryStore({
  checkPeriod: 86400000 // prune expired entries every 24h
});

// Configure session middleware with PostgreSQL session store
const PgSession = connectPgSimple(session);

// Initialize session store with a robust fallback mechanism
let sessionStore;
let usingPgStore = false;

// Function to create PostgreSQL session store
const createPgSessionStore = () => {
  try {
    // Using a more resilient configuration
    const pgStore = new PgSession({
      pool,
      tableName: 'session', // Use this specific table name for compatibility
      createTableIfMissing: true, // Create the session table if it doesn't exist
      pruneSessionInterval: 60 * 15, // Prune less frequently - every 15 minutes
      errorLog: (error) => {
        console.error('PostgreSQL session store error:', error);
        // If we get an error related to connection, switch to memory store
        if (error.message && (
          error.message.includes('Connection terminated') || 
          error.message.includes('connection timeout') || 
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('Connection refused')
        )) {
          console.log('Connection issue detected, switching to memory store');
          sessionStore = memorySessionStore;
          usingPgStore = false;
        }
      },
    });
    return pgStore;
  } catch (error) {
    console.error('Failed to initialize PostgreSQL session store:', error);
    return null;
  }
};

// Try to use PostgreSQL first
const pgStore = createPgSessionStore();
if (pgStore) {
  sessionStore = pgStore;
  usingPgStore = true;
  console.log('Using PostgreSQL session store');
} else {
  console.log('Falling back to memory session store');
  sessionStore = memorySessionStore;
}

// Configure CORS to allow cross-origin requests for development/embedding
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Configure the session middleware
app.set('trust proxy', 1); // Trust first proxy for secure cookies behind a proxy
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'investment-tracker-secret',
  name: 'investment_tracker.sid', // Custom cookie name to avoid conflicts
  resave: true, // Changed to true to ensure session is saved on every request
  saveUninitialized: false,
  rolling: true, // Reset cookie expiration on every response
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // Extended to 7 days for better persistence
    httpOnly: true,
    sameSite: 'lax',
    path: '/' // Ensure cookie is available for all paths
  }
}));

// Add ability to switch back to PG store when database becomes available
const tryRestorePgSessionStore = () => {
  if (!usingPgStore && pool) {
    try {
      const pgStore = createPgSessionStore();
      if (pgStore) {
        console.log('Database connection restored - switching back to PostgreSQL session store');
        sessionStore = pgStore;
        usingPgStore = true;
        
        // Setup a periodic check to attempt to restore PG store if needed
        setInterval(() => {
          if (!usingPgStore) {
            tryRestorePgSessionStore();
          }
        }, 5 * 60 * 1000); // Check every 5 minutes
        
        return true;
      }
    } catch (error) {
      console.error('Failed to restore PostgreSQL session store:', error);
    }
  }
  return false;
};

// Register periodic health checks for session store
setInterval(() => {
  tryRestorePgSessionStore();
}, 30 * 1000); // Check every 30 seconds initially

// Session debug middleware with more detailed output
app.use((req, res, next) => {
  // Try to restore PG session store on auth endpoints first
  if (req.path.startsWith('/api/auth') && !usingPgStore) {
    tryRestorePgSessionStore();
  }
  
  // Enhanced logging only for auth endpoints
  if (req.path.startsWith('/api/auth')) {
    console.log(`Session debug [${req.method} ${req.path}]: sessionID=${req.sessionID?.substring(0, 8)}..., hasSession=${!!req.session}, userId=${req.session?.userId || 'none'}, using_pg_store=${usingPgStore}, headers=${JSON.stringify(req.headers['cookie']?.substring(0, 20) || 'none')}`);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
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

// Ensure the uploads directory exists
const uploadDir = path.join(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads directory:', uploadDir);
}

(async () => {
  console.log('Initializing database connection...');
  // Database is already initialized, and we're using it for session storage
  
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
