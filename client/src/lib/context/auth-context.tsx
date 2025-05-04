import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/services/api";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  fullName: string;
  initials: string;
  email: string;
  role: string;
  avatarColor: string;
}

interface RegisterData {
  username: string;
  password: string;
  passwordConfirm: string;
  fullName: string;
  email: string;
  role?: string;
  initials?: string;
  avatarColor?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize with null user, we'll check auth status on mount
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as loading until we check auth
  const { toast } = useToast();


  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const userData = await apiService.auth.login(username, password);
      setUser(userData);
      
      // In a real app, store the token
      // localStorage.setItem('authToken', data.token);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.fullName}!`
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid username or password",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.auth.logout();
      setUser(null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully"
      });
      // Invalidate any cached user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: "Could not log out properly",
        variant: "destructive"
      });
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const newUser = await apiService.auth.register(userData);
      setUser(newUser);
      toast({
        title: "Registration successful",
        description: `Welcome, ${newUser.fullName}! Your account has been created.`
      });
    } catch (error) {
      console.error('Registration error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Registration failed';
      toast({
        title: "Registration failed",
        description: errorMsg,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // When component mounts, check if user is already logged in
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        // Try to get the current user from the server
        const userData = await apiService.auth.getCurrentUser();
        setUser(userData);
      } catch (error) {
        // If it fails, user is not authenticated
        console.log('No active session found');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
