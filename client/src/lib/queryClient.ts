import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  isFormData: boolean = false,
): Promise<Response> {
  const options: RequestInit = {
    method,
    credentials: "include",
  };

  if (data) {
    if (isFormData) {
      // Don't set Content-Type for FormData; let the browser set it with boundary
      options.body = data as FormData;
    } else {
      options.headers = { "Content-Type": "application/json" };
      options.body = JSON.stringify(data);
    }
  }

  const res = await fetch(url, options);
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-cache"
        }
      });
      
      // Add debugging
      console.log(`[QueryClient] Fetching ${queryKey[0]}, status: ${res.status}`);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`[QueryClient] Returning null for 401 response`); 
        return null;
      }
      
      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error(`[QueryClient] Error fetching ${queryKey[0]}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Changed to true to allow refreshing auth when returning to window
      refetchOnMount: true, // Added to refresh when component mounts
      refetchOnReconnect: true, // Added to refresh on network reconnection
      staleTime: 5 * 60 * 1000, // Changed to 5 minutes to allow some caching but still refresh periodically
      retry: 1, // Allow one retry on failure
      retryDelay: 1000, // Retry after 1 second
    },
    mutations: {
      retry: 1, // Allow one retry on failure
    },
  },
});
