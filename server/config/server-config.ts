/**
 * Centralized server configuration
 * All server-side configuration should be managed through this file
 */

// Environment configuration
export const SERVER_CONFIG = {
  // Server settings
  PORT: parseInt(process.env.PORT || '5000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // Session configuration
  SESSION_SECRET: process.env.SESSION_SECRET || '',
  SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE || '604800000', 10), // 7 days
  
  // Security settings
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  
  // File upload settings
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'data/uploads',
  
  // Rate limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // External services
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Background jobs
  REDIS_URL: process.env.REDIS_URL || '',
  JOB_CONCURRENCY: parseInt(process.env.JOB_CONCURRENCY || '5', 10),
};

// Validation function to ensure required configuration is present
export function validateConfig(): { isValid: boolean; missingVars: string[] } {
  const requiredVars = [
    'DATABASE_URL',
    'SESSION_SECRET',
  ];
  
  const missingVars = requiredVars.filter(varName => {
    const value = SERVER_CONFIG[varName as keyof typeof SERVER_CONFIG];
    return !value || value === '';
  });
  
  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
}

// Environment type guards
export const isDevelopment = () => SERVER_CONFIG.NODE_ENV === 'development';
export const isProduction = () => SERVER_CONFIG.NODE_ENV === 'production';
export const isTest = () => SERVER_CONFIG.NODE_ENV === 'test';