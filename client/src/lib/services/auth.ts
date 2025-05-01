import { apiRequest } from '../queryClient';
import { User } from '@shared/schema';

type LoginResponse = Omit<User, 'password'>;
type AuthError = { message: string };

/**
 * Authenticate user with username and password
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
}

/**
 * Logout current user
 */
export async function logout(): Promise<{ success: boolean; message: string }> {
  return apiRequest('/api/auth/logout', {
    method: 'POST'
  });
}

/**
 * Get current authenticated user info
 */
export async function getCurrentUser(): Promise<LoginResponse | null> {
  try {
    return await apiRequest('/api/auth/me');
  } catch (error) {
    // Not authenticated
    return null;
  }
}
