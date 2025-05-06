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

// Configure resilient session store with fallback capability
const PgSession = connectPgSimple(session);

// Create a unified ResilientSessionStore class that handles failover
class ResilientSessionStore {
  private memoryStore: any; // MemoryStore instance
  private pgStore: any; // PgSession instance
  private usingPgStore: boolean = false;
  private failureCount: number = 0;
  private readonly MAX_FAILURES = 3;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 30000; // 30 seconds

  constructor() {
    // Create memory store first (always available)
    this.memoryStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });

    // Try to create PG store
    try {
      this.pgStore = new PgSession({
        pool,
        tableName: 'session',
        // Don't create tables at startup - helps avoid connection errors
        createTableIfMissing: false,
        pruneSessionInterval: 60 * 15,
        // Disable the automatic ping to prevent connection errors
        disableTouch: true, 
        errorLog: this.handlePgError.bind(this),
      });
      
      // Start with memory store for safety
      this.usingPgStore = false;
      console.log('Created PostgreSQL session store but starting with memory store for safety');
      
      // Start health check to switch to PG if available
      this.startHealthCheck();
    } catch (error) {
      console.error('Failed to initialize PostgreSQL session store:', error);
      this.pgStore = null as any;
      this.usingPgStore = false;
      console.log('Using memory session store only');
    }
  }

  private handlePgError(error: Error): void {
    console.error('PostgreSQL session store error:', error);
    
    // If we're using PG store and get a connection error, increment failure count
    if (this.usingPgStore) {
      if (error.message && (
        error.message.includes('Connection terminated') || 
        error.message.includes('connection timeout') || 
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('Connection refused')
      )) {
        this.failureCount++;
        console.log(`PG session store failure count: ${this.failureCount}/${this.MAX_FAILURES}`);
        
        // If too many failures, switch to memory store
        if (this.failureCount >= this.MAX_FAILURES) {
          console.log('Too many PG session store failures, switching to memory store');
          this.usingPgStore = false;
          this.failureCount = 0;
        }
      }
    }
  }

  private startHealthCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.checkInterval = setInterval(() => {
      this.checkPgConnection();
    }, this.CHECK_INTERVAL_MS);
  }

  private async checkPgConnection(): Promise<void> {
    // Only check if we're not using PG store and we have a PG store
    if (!this.usingPgStore && this.pgStore) {
      try {
        // Simple query to check if connection works
        await pool.query('SELECT 1 AS test');
        
        // If we get here, connection works, switch to PG store
        console.log('PostgreSQL connection is healthy, switching to PG session store');
        this.usingPgStore = true;
        this.failureCount = 0;
      } catch (error) {
        console.log('PostgreSQL connection check failed, staying with memory store');
      }
    }
  }

  public get store(): any {
    // Return the appropriate store based on current state
    return this.usingPgStore ? this.pgStore : this.memoryStore;
  }

  public get isUsingPgStore(): boolean {
    return this.usingPgStore;
  }
}

// Create instance of our resilient store
const resilientStore = new ResilientSessionStore();

// For debugging/logging
let sessionStore = resilientStore.store;
let usingPgStore = resilientStore.isUsingPgStore;
console.log(`Initial session store: ${usingPgStore ? 'PostgreSQL' : 'Memory'}`);

// Add session diagnostics middleware
app.use((req: any, res, next) => {
  const sessionId = req.sessionID ? req.sessionID.substring(0, 10) + '...' : 'none';
  const hasSession = !!req.session;
  const userId = req.session?.userId || 'none';
  
  // Update variables for each request for accurate logging
  usingPgStore = resilientStore.isUsingPgStore;
  sessionStore = resilientStore.store;
  
  if (req.path.startsWith('/api')) {
    console.log(`Session debug [${req.method} ${req.path}]: sessionID=${sessionId}, hasSession=${hasSession}, userId=${userId}, using_pg_store=${usingPgStore}, headers="${req.get('cookie') ? 'present' : 'none'}"`);
  }
  next();
});

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

// No need for the extra tryRestorePgSessionStore function - the resilient store handles it

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
