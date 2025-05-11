// Add debug print to confirm this is the actual boot file
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const moduleUrl = import.meta.url;
const modulePath = fileURLToPath(moduleUrl);
console.log("🐞  Boot file:", modulePath);

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
import { StorageFactory } from "./storage-factory";
import { initJobQueues } from "./jobs";
import { metricsMiddleware } from "./middleware/metrics";
import { LoggingService } from "./services";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// ─── SESSION CONFIGURATION - SINGLE POINT OF TRUTH ─────────────────────────
// Initialize the StorageFactory to use the hybrid storage implementation
const storage = StorageFactory.getStorage();

// Create the appropriate session store classes
const PgSession = connectPgSimple(session);

// Always use PostgreSQL for sessions in production to ensure consistency
// Memory sessions should only be used for development or testing
const isProd = process.env.NODE_ENV === 'production';
const forceUseMemory = process.env.USE_MEMORY_SESSIONS === "true";

// Default to PostgreSQL in production, regardless of USE_MEMORY_SESSIONS setting
// This prevents accidental session store switching in production
let sessionStore;

if (isProd || !forceUseMemory) {
  // Use PostgreSQL in production or when not explicitly using memory
  try {
    sessionStore = new PgSession({ 
      pool, 
      tableName: "session",
      createTableIfMissing: true,
      pruneSessionInterval: 60 // Prune expired sessions every 60 seconds
    });
    console.log("▶ Using PgSession for sessions (PostgreSQL)");
  } catch (error) {
    console.error("Failed to create PostgreSQL session store:", error);
    if (isProd) {
      throw new Error("Cannot run in production without PostgreSQL session store");
    } else {
      // Fallback to memory store only in dev mode
      const MemoryStore = memorystore(session);
      sessionStore = new MemoryStore({ checkPeriod: 86400000 }); // 24 hours
      console.log("▶ Fallback to MemoryStore for sessions due to PostgreSQL error");
    }
  }
} else {
  // Explicit request for memory store in non-production
  const MemoryStore = memorystore(session);
  sessionStore = new MemoryStore({ checkPeriod: 86400000 }); // 24 hours
  console.log("▶ Using MemoryStore for sessions (explicitly requested)");
}

// Debug the session store to verify it remains consistent
console.log("⏱️  Session store is", sessionStore.constructor.name);

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

// Apply session middleware with a fixed store chosen at startup
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "dlf-dev-secret",
    name: "dlf.sid",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,        // 7 days
    },
  })
);

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
  
  // Initialize background job queues
  try {
    initJobQueues();
    console.log('Background job processing system initialized');
  } catch (error) {
    console.error('Failed to initialize background jobs:', error);
    console.log('Continuing without background processing');
  }
  
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
