/**
 * Constants related to authentication and authorization
 */

// Number of salt rounds for bcrypt password hashing
export const SALT_ROUNDS = 10;

// Authentication error messages
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid username or password',
  AUTH_REQUIRED: 'Authentication required',
  PERMISSION_DENIED: 'You do not have permission to access this resource',
  USERNAME_EXISTS: 'Username already exists',
  EMAIL_EXISTS: 'Email already exists',
};

// Session data keys
export const SESSION_KEYS = {
  USER_ID: 'userId',
  USERNAME: 'username',
  ROLE: 'role',
};
