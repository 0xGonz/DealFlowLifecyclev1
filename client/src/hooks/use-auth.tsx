import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient
} from "@tanstack/react-query";
import { User } from "@/lib/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  data: User | null;
  isLoading: boolean;
  error: Error | null;
  login: UseMutationResult<User, Error, LoginData>;
  logout: UseMutationResult<void, Error, void>;
  register: UseMutationResult<User, Error, RegisterData>;
  refreshAuth: () => Promise<User | null>;
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

async function fetchCurrentUser(): Promise<User | null> {
  try {
    console.log('Fetching current user data');
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (response.status === 401) {
      console.log('User is not authenticated (401 response)');
      return null;
    }
    
    if (!response.ok) {
      console.error('Error fetching user:', response.status, response.statusText);
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }
    
    const userData = await response.json();
    console.log('Current user data fetched successfully:', userData);
    return userData;
  } catch (error) {
    console.error('Exception in fetchCurrentUser:', error);
    return null;
  }
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const localQueryClient = useQueryClient();
  
  const {
    data,
    error,
    isLoading,
    refetch,
  } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    retryDelay: 1000,
  });

  // Refresh auth method that can be called manually
  const refreshAuth = async (): Promise<User | null> => {
    console.log('Manual auth refresh requested');
    const result = await refetch();
    return result.data ?? null;
  };

  const login = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log('Auth login mutation starting with credentials:', { username: credentials.username, password: '******' });
      try {
        const res = await apiRequest("POST", "/api/auth/login", credentials);
        const userData = await res.json();
        console.log('Login API response successful:', userData);
        return userData;
      } catch (error) {
        console.error('Login API request failed:', error);
        throw error;
      }
    },
    onSuccess: async (user: User) => {
      console.log('Login mutation onSuccess handler, setting user data:', user);
      localQueryClient.setQueryData(["/api/auth/me"], user);
      
      // Force a refresh to ensure we have the correct data
      await refreshAuth();
    },
    onError: (error: Error) => {
      console.error('Login mutation onError handler:', error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      localQueryClient.setQueryData(["/api/auth/me"], null);
      localQueryClient.invalidateQueries({queryKey: ["/api/auth/me"]});
      window.location.href = "/auth";
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const register = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("POST", "/api/auth/register", userData);
      return await res.json();
    },
    onSuccess: async (user: User) => {
      localQueryClient.setQueryData(["/api/auth/me"], user);
      
      // Force a refresh to ensure we have the correct data
      await refreshAuth();
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check for session on page load
  useEffect(() => {
    console.log('Auth provider mounted - checking authentication status');
    refreshAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        data: data ?? null,
        isLoading,
        error,
        login,
        logout,
        register,
        refreshAuth
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
