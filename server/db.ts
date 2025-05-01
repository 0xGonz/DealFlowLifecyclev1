import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

type DbClient = {
  pool: Pool;
  db: ReturnType<typeof drizzle>;
} | null;

let dbClient: DbClient = null;

try {
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL not set, skipping database initialization');
  } else {
    console.log('Initializing database connection...');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    dbClient = { pool, db };
    console.log('Database connection initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize database:', error);
}

export const pool = dbClient?.pool;
export const db = dbClient?.db;
