import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@shared/schema';
import { getCurrentUser, login as loginApi, logout as logoutApi } from '../services/auth';

type AuthUser = Omit<User, 'password'>;

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in when component mounts
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (err) {
        // Handle error silently as this is just a check
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const userData = await loginApi(username, password);
      setUser(userData);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutApi();
      setUser(null);
    } catch (err: any) {
      setError(err.message || 'Failed to logout');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
