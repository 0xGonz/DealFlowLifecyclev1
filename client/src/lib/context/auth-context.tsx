import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/services/api";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  fullName: string;
  initials: string;
  email: string;
  role: string;
  avatarColor: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Create a mock user for development
const mockUser: User = {
  id: 1,
  username: "admin",
  fullName: "Admin User",
  initials: "AU",
  email: "admin@example.com",
  role: "admin",
  avatarColor: "#4f46e5"
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize with mock user for bypassing login during development
  const [user, setUser] = useState<User | null>(mockUser);
  const [isLoading, setIsLoading] = useState(false); // Set to false since we've already set the mock user
  const { toast } = useToast();

  // Development bypass - commenting out the real auth check
  // useEffect(() => {
  //   const checkAuthStatus = async () => {
  //     try {
  //       // Try to get the current user from the server
  //       const userData = await apiService.auth.getCurrentUser();
  //       setUser(userData);
  //     } catch (error) {
  //       // If it fails, user is not authenticated
  //       console.log('No active session found');
  //       setUser(null);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };
  //   
  //   checkAuthStatus();
  // }, []);

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
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: "Could not log out properly",
        variant: "destructive"
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
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
