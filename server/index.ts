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

// Create session stores
// First create a memory store for fallback
const MemoryStore = memorystore(session);
const memoryStore = new MemoryStore({
  checkPeriod: 86400000 // prune expired entries every 24h
});

// Increase max listeners to prevent warnings
// This is needed because we're adding listeners in multiple places
memoryStore.setMaxListeners(1000); // Significantly increase to prevent MaxListenersExceededWarning

// Configure PostgreSQL session store
const PgSession = connectPgSimple(session);

// Session store instance that will be used by the app
let activeSessionStore: any;

// Try to initialize the PostgreSQL session store with improved error handling
try {
  // More resilient PostgreSQL session store configuration with recovery options
  activeSessionStore = new PgSession({
    pool,
    tableName: 'session', // Use this specific table name for compatibility
    createTableIfMissing: true, // Create the session table if it doesn't exist
    pruneSessionInterval: 1800, // Reduced prune frequency to every 30 minutes to further decrease DB load
    errorLog: (error) => {
      console.error('PostgreSQL session store error:', error);
      // If we get connection errors, switch to memory store automatically
      if (error.message && (
        error.message.includes('termina') || 
        error.message.includes('conn') || 
        error.message.includes('timeout')
      )) {
        console.log('PgSession error detected - switching to memory store');
        activeSessionStore = memoryStore;
      }
    },
    schemaName: 'public', // Explicitly set schema name
    disableTouch: false, // Enable touch to update the last access time
    ttl: 86400 * 7, // Session lifetime in seconds (7 days, same as cookie)
    // Increased timeouts for better tolerance to connection issues
    conObject: {
      connectionTimeoutMillis: 15000,
      query_timeout: 10000
    }
  });
  
  // Increase max listeners to prevent warnings
  activeSessionStore.setMaxListeners(1000);
  
  // Also increase PgStore emit listeners to avoid warnings
  if (activeSessionStore.pool && typeof activeSessionStore.pool.setMaxListeners === 'function') {
    activeSessionStore.pool.setMaxListeners(1000);
  }
  
  // Check session table exists and is accessible
  pool.query('SELECT 1 FROM session LIMIT 1')
    .then(() => {
      console.log('Session table verified and accessible');
    })
    .catch((err) => {
      console.log('Creating session table if it doesn\'t exist...');
      // The createTableIfMissing option should handle this, but we'll verify manually
      pool.query(`
        CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
        )
      `).then(() => {
        console.log('Session table created successfully');
      }).catch((createErr) => {
        console.error('Error creating session table:', createErr);
        console.log('Continuing with memory storage due to table creation failure');
        activeSessionStore = memoryStore;
      });
    });
  
  console.log('Using PostgreSQL session store');
} catch (error) {
  console.error('Failed to initialize PostgreSQL session store:', error);
  console.log('Falling back to memory session store');
  activeSessionStore = memoryStore;
  
  // Set higher max listeners when falling back to memory store
  memoryStore.setMaxListeners(1000);
}

// Create a function to get the appropriate session store with automatic fallback
let lastDbCheck = 0;
const DB_CHECK_INTERVAL = 60000; // 1 minute between DB checks

const getSessionStore = () => {
  const now = Date.now();
  
  // Only perform DB check once per minute to reduce strain and prevent excessive event listeners
  if (activeSessionStore instanceof PgSession && (now - lastDbCheck > DB_CHECK_INTERVAL)) {
    lastDbCheck = now;
    
    // Check if PostgreSQL is still available
    pool.query('SELECT 1')
      .catch(err => {
        console.error('PostgreSQL connection failed, switching to memory session store:', err);
        activeSessionStore = memoryStore;
        
        // Ensure memory store has enough event listeners
        memoryStore.setMaxListeners(1000);
      });
  }
  return activeSessionStore;
};

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

// Add error handling for session store
app.use((req, res, next) => {
  // Apply session middleware with error handling
  session({
    store: getSessionStore(), // Get the appropriate session store with fallback capability
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
  })(req, res, (err) => {
    if (err) {
      console.error('Session middleware error:', err);
      
      // If there's a database error, switch to memory store for this request
      if (err.message && (err.message.includes('termina') || err.message.includes('conn'))) {
        console.log('Switching to memory store due to database connection error');
        activeSessionStore = memoryStore;
        
        // Ensure memory store has enough event listeners when used as fallback
        memoryStore.setMaxListeners(1000);
        
        // Try again with memory store
        session({
          store: memoryStore,
          secret: process.env.SESSION_SECRET || 'investment-tracker-secret',
          name: 'investment_tracker.sid',
          resave: true,
          saveUninitialized: false,
          rolling: true,
          cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: 'lax',
            path: '/'
          }
        })(req, res, next);
      } else {
        // For other errors, continue with the error
        next(err);
      }
    } else {
      next();
    }
  });
});

// Session debug middleware with more detailed output
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth')) {
    console.log(`Session debug [${req.method} ${req.path}]: sessionID=${req.sessionID?.substring(0, 8)}..., hasSession=${!!req.session}, userId=${req.session?.userId || 'none'}, headers=${JSON.stringify(req.headers['cookie']?.substring(0, 20) || 'none')}`);
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
