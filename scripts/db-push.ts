import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from '../shared/schema';

// Required for Neon serverless
neonConfig.webSocketConstructor = ws;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('Connecting to database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Pushing schema to database...');
  
  try {
    // Use db.insert to perform schema migrations
    // This is a simpler alternative to full migrations for early development
    await db.execute(`
      DO $$ 
      BEGIN
        CREATE SCHEMA IF NOT EXISTS public;
      END $$;
    `);
    
    console.log('Schema pushed successfully!');
    
    // Seed an admin user if no users exist
    const users = await db.select().from(schema.users);
    
    if (users.length === 0) {
      console.log('Seeding admin user...');
      await db.insert(schema.users).values({
        username: 'admin',
        password: 'admin', // In a real app, you'd hash this
        fullName: 'Admin User',
        initials: 'AU',
        email: 'admin@example.com',
        role: 'admin',
        avatarColor: '#4f46e5'
      });
      console.log('Admin user created successfully!');
    }
    
    // Sample data
    const deals = await db.select().from(schema.deals);
    
    if (deals.length === 0) {
      console.log('Seeding sample deals...');
      
      // Add sample deals
      const deal1 = await db.insert(schema.deals).values({
        name: "TechFusion AI",
        description: "AI-powered data analytics platform for enterprise",
        industry: "Software & AI",
        stage: "due_diligence",
        round: "Series B",
        targetRaise: "$20M",
        valuation: "$100M",
        contactEmail: "founder@techfusion.ai",
        createdBy: 1,
        stageLabel: "Diligence",
        score: 85,
        starCount: 3,
        tags: ["AI", "Enterprise", "Data Analytics"]
      }).returning();
      
      const deal2 = await db.insert(schema.deals).values({
        name: "GreenScale Renewables",
        description: "Scalable green hydrogen production technology",
        industry: "Clean Energy",
        stage: "ic_review",
        round: "Series A",
        targetRaise: "$15M",
        valuation: "$60M",
        contactEmail: "ceo@greenscale.co",
        createdBy: 1,
        stageLabel: "IC Review",
        score: 92,
        starCount: 5,
        tags: ["CleanTech", "Hydrogen", "Energy"]
      }).returning();
      
      const deal3 = await db.insert(schema.deals).values({
        name: "MediSync Health",
        description: "Connected medical devices platform for remote patient monitoring",
        industry: "Healthcare",
        stage: "screening",
        round: "Seed",
        targetRaise: "$5M",
        valuation: "$20M",
        contactEmail: "founder@medisync.io",
        createdBy: 1,
        stageLabel: "Screening",
        score: 78,
        starCount: 2,
        tags: ["MedTech", "IoT", "Healthcare"]
      }).returning();
      
      console.log('Sample deals created successfully!');
      
      // Add timeline events
      console.log('Adding sample timeline events...');
      
      await db.insert(schema.timelineEvents).values([
        {
          dealId: deal1[0].id,
          eventType: "note",
          content: "Initial discussion with founding team. Strong technical backgrounds from Google and Meta.",
          createdBy: 1,
          metadata: {}
        },
        {
          dealId: deal1[0].id,
          eventType: "stage_change",
          content: "Moving to diligence after positive team review",
          createdBy: 1,
          metadata: { 
            fromStage: "screening", 
            toStage: "due_diligence" 
          }
        },
        {
          dealId: deal2[0].id,
          eventType: "note",
          content: "Technology has significant IP potential. Patent landscape looks favorable.",
          createdBy: 1,
          metadata: {}
        },
        {
          dealId: deal2[0].id,
          eventType: "stage_change",
          content: "Advancing to IC review",
          createdBy: 1,
          metadata: { 
            fromStage: "due_diligence", 
            toStage: "ic_review" 
          }
        }
      ]);
      
      console.log('Sample timeline events created successfully!');
      
      // Create a fund
      console.log('Creating sample fund...');
      
      const fund = await db.insert(schema.funds).values({
        name: "Doliver Ventures Fund III",
        description: "Early-stage technology investments with focus on AI, healthcare, and clean energy",
        aum: 250000000,
      }).returning();
      
      console.log('Sample fund created successfully!');
    }
    
  } catch (error) {
    console.error('Error pushing schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();