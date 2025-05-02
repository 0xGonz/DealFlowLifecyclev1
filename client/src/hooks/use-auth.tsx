import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, insertUserSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, fullName: string, email: string, password: string) => Promise<void>;
  mutateUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const login = async (username: string, password: string) => {
    try {
      await apiRequest("POST", "/api/auth/login", { username, password });
      await refetch();
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      queryClient.setQueryData(["/api/auth/me"], null);
      await refetch();
    } catch (error) {
      console.error("Logout failed", error);
      throw error;
    }
  };

  const register = async (username: string, fullName: string, email: string, password: string) => {
    try {
      // Calculate initials from full name
      const nameParts = fullName.split(' ');
      const initials = nameParts.length > 1 
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}` 
        : fullName.substring(0, 2);
      
      const userData = {
        username,
        fullName,
        email,
        password,
        initials: initials.toUpperCase(),
        role: "analyst", // Default role
        avatarColor: "blue-600", // Default color
      };
      
      await apiRequest("POST", "/api/auth/register", userData);
      
      // Auto login after registration
      await login(username, password);
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "Username or email may already be in use",
        variant: "destructive",
      });
      throw error;
    }
  };

  const mutateUser = async () => {
    await refetch();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error: error as Error | null,
        login,
        logout,
        register,
        mutateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
