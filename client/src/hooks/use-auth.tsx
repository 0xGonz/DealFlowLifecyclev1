import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types from schema
type Role = "admin" | "partner" | "analyst" | "observer";

interface User {
  id: number;
  username: string;
  fullName: string;
  initials: string;
  email: string;
  role: Role;
  avatarColor: string;
}

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = LoginData & {
  fullName: string;
  email: string;
  role: Role;
  initials: string;
  avatarColor: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Fetch the current user
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/me"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation<User, Error, LoginData>({
    mutationFn: async (credentials) => {
      console.log("Sending login credentials to /api/login");
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: 'include' // Important for cookies/session
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Login failed");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/me"], data);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.fullName}!`,
      });
    },
    onError: (error) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation<User, Error, RegisterData>({
    mutationFn: async (userData) => {
      console.log("Sending register data to /api/register:", userData);
      
      try {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
          credentials: 'include' // Important for cookies/session
        });

        console.log("Registration response status:", res.status);
        
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Registration error response:", errorData);
          throw new Error(errorData.message || "Registration failed");
        }

        const data = await res.json();
        console.log("Registration success response:", data);
        return data;
      } catch (err) {
        console.error("Registration fetch error:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/me"], data);
      toast({
        title: "Registration successful",
        description: `Welcome, ${data.fullName}!`,
      });
    },
    onError: (error) => {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: 'include' // Important for cookies/session
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Logout failed");
      }

      return;
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/me"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
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
