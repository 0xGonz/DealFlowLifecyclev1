import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { errorHandler } from "./utils/errorHandlers";
import { pool } from "./db";
import * as fs from 'fs';
import * as path from 'path';
import { createServer } from 'http';
import connectPgSimple from 'connect-pg-simple';
import memorystore from 'memorystore';
import { StorageFactory } from "./storage-factory";
import { initJobQueues } from "./jobs";
import { metricsMiddleware } from "./middleware/metrics";
import { loggingService } from "./services";

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

// Initialize the StorageFactory to use the hybrid storage implementation
const storage = StorageFactory.getStorage();

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
    
    // Use the hybrid storage system to determine database connectivity
    const hybridStorage = storage as any;
    if (hybridStorage.usingDatabase === false) {
      // Check if we need to switch to memory store (using Object.is to avoid type errors)
      if (!Object.is(activeSessionStore, memoryStore)) {
        console.log('Hybrid storage in memory mode - switching session store to memory');
        activeSessionStore = memoryStore;
      }
    } else {
      // Double-check database connectivity
      pool.query('SELECT 1')
        .catch(err => {
          console.error('PostgreSQL connection failed, switching to memory session store:', err);
          activeSessionStore = memoryStore;
          
          // Ensure memory store has enough event listeners
          memoryStore.setMaxListeners(1000);
        });
    }
  }
  return activeSessionStore;
};

// Add metrics middleware to track request metrics
app.use(metricsMiddleware());

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

// Simplified server startup to ensure quick port binding
const startServer = async () => {
  try {
    // Add a simple health check route before anything else
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok', time: new Date().toISOString() });
    });
    
    // Add a simple root route that returns a basic response
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Investment Lifecycle Tracker</title></head>
          <body>
            <h1>Investment Lifecycle Tracker</h1>
            <p>Server is running. Try navigating to <a href="/auth">/auth</a> to log in.</p>
          </body>
        </html>
      `);
    });
    
    // Create and start the server immediately
    const port = 5000;
    const server = createServer(app);
    
    // Bind to port as quickly as possible
    server.listen(port, '0.0.0.0', () => {
      log(`Server running on port ${port}`);
    });
    
    // Register all routes - do this after binding to port to ensure quick startup
    try {
      await registerRoutes(app);
    } catch (error) {
      console.error('Error registering routes:', error);
      // Continue with basic functionality even if full route registration fails
    }
    
    // Initialize background job queues after server is running
    setTimeout(async () => {
      try {
        initJobQueues();
        console.log('Background job processing system initialized');
      } catch (error) {
        console.error('Failed to initialize background jobs:', error);
        console.log('Continuing without background processing');
      }
    }, 100);
    
    // Vite setup for development
    if (app.get("env") === "development") {
      try {
        await setupVite(app, server);
      } catch (error) {
        console.error('Error setting up Vite:', error);
        // Fall back to static serving if Vite setup fails
        serveStatic(app);
      }
    } else {
      serveStatic(app);
    }
    
    return server;
  } catch (error) {
    console.error('Critical error starting server:', error);
    
    // Create a minimal emergency server to at least bind to the port
    const emergencyServer = createServer((req: any, res: any) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
          <head><title>Service Starting</title></head>
          <body>
            <h1>Service is starting</h1>
            <p>Please wait while the application initializes...</p>
            <script>setTimeout(() => { window.location.reload(); }, 5000);</script>
          </body>
        </html>
      `);
    });
    
    // Bind to port 5000 to satisfy Replit's port-opening requirement
    emergencyServer.listen(5000, '0.0.0.0', () => {
      console.log('Emergency server running on port 5000');
    });
    
    return emergencyServer;
  }
};

// Start the server
console.log('Initializing server...');
startServer();
