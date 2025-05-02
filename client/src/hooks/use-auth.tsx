import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation, UseMutationResult } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type UserWithoutPassword = Omit<User, "password">;

type AuthContextType = {
  user: UserWithoutPassword | null;
  isLoading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<UserWithoutPassword>;
  register: (
    username: string,
    fullName: string,
    email: string,
    password: string
  ) => Promise<UserWithoutPassword>;
  logout: () => Promise<void>;
  updateProfile: (userId: number, data: UpdateProfileData) => Promise<UserWithoutPassword>;
  loginMutation: UseMutationResult<UserWithoutPassword, Error, LoginData>;
  registerMutation: UseMutationResult<UserWithoutPassword, Error, RegisterData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  updateProfileMutation: UseMutationResult<UserWithoutPassword, Error, { userId: number; data: UpdateProfileData }>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  fullName: string;
  email: string;
  password: string;
};

type UpdateProfileData = {
  fullName?: string;
  email?: string;
  role?: "admin" | "partner" | "analyst" | "observer";
  avatarColor?: string | null;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Get the current user
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<UserWithoutPassword | null, Error>({
    queryKey: ["/api/auth/me"],
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
    // If 401 is returned, just return null user (not authenticated) instead of error
    queryFn: async ({ signal }) => {
      try {
        const response = await fetch("/api/auth/me", { signal });
        if (response.status === 401) {
          return null;
        }
        if (!response.ok) {
          throw new Error(`Error fetching user: ${response.statusText}`);
        }
        return await response.json();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return null; // Handle abort gracefully
        }
        throw err;
      }
    },
  });

  // Login mutation
  const loginMutation = useMutation<UserWithoutPassword, Error, LoginData>({
    mutationFn: async (credentials) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to login");
      }

      return await response.json();
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.fullName}!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation<UserWithoutPassword, Error, RegisterData>({
    mutationFn: async (userData) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to register");
      }

      return await response.json();
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
      toast({
        title: "Registration successful",
        description: `Welcome, ${userData.fullName}!`,
      });
    },
    onError: (error) => {
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
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to logout");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
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

  // Update profile mutation
  const updateProfileMutation = useMutation<
    UserWithoutPassword,
    Error,
    { userId: number; data: UpdateProfileData }
  >({
    mutationFn: async ({ userId, data }) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile");
      }

      return await response.json();
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Profile update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Wrapper functions for easier usage
  const login = async (username: string, password: string) => {
    return await loginMutation.mutateAsync({ username, password });
  };

  const register = async (
    username: string,
    fullName: string,
    email: string,
    password: string
  ) => {
    return await registerMutation.mutateAsync({
      username,
      fullName,
      email,
      password,
    });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const updateProfile = async (userId: number, data: UpdateProfileData) => {
    return await updateProfileMutation.mutateAsync({ userId, data });
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        login,
        register,
        logout,
        updateProfile,
        loginMutation,
        registerMutation,
        logoutMutation,
        updateProfileMutation,
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
