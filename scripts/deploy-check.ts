#!/usr/bin/env tsx

import { db } from '../server/db';
import { users, deals, funds } from '../shared/schema';

/**
 * Deployment readiness check script
 * Verifies database connection and core functionality
 */
async function deploymentCheck() {
  console.log('🚀 Starting deployment readiness check...');
  
  try {
    // Test database connection
    console.log('📊 Testing database connection...');
    const userCount = await db.select().from(users).limit(1);
    console.log('✅ Database connection successful');
    
    // Test basic queries
    console.log('🔍 Testing core queries...');
    const dealCount = await db.select().from(deals).limit(1);
    const fundCount = await db.select().from(funds).limit(1);
    console.log('✅ Core queries functional');
    
    // Check environment variables
    console.log('🔧 Checking environment configuration...');
    const requiredVars = ['DATABASE_URL'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('⚠️  Missing environment variables:', missingVars);
    } else {
      console.log('✅ All required environment variables present');
    }
    
    console.log('🎉 Deployment readiness check completed successfully!');
    
    return {
      status: 'ready',
      database: 'connected',
      queries: 'functional',
      environment: missingVars.length === 0 ? 'complete' : 'incomplete'
    };
    
  } catch (error) {
    console.error('❌ Deployment check failed:', error);
    return {
      status: 'failed',
      error: error.message
    };
  }
}

if (require.main === module) {
  deploymentCheck()
    .then(result => {
      console.log('Final status:', result);
      process.exit(result.status === 'ready' ? 0 : 1);
    })
    .catch(error => {
      console.error('Check failed:', error);
      process.exit(1);
    });
}

export { deploymentCheck };