import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type SystemHealthResponse = {
  status: string;
  timestamp: string;
  storage: 'database' | 'memory';
  databaseConnected: boolean;
  environment: string;
};

export function DatabaseStatusAlert() {
  const { data: healthData } = useQuery<SystemHealthResponse>({
    queryKey: ['/api/system/health'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });

  // Only show alert if we have data and we're in memory storage mode
  if (!healthData || (healthData.storage === 'database' && healthData.databaseConnected)) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4 fixed bottom-4 right-4 z-50 max-w-md shadow-lg">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Database Connection Issue</AlertTitle>
      <AlertDescription>
        {healthData.storage === 'memory' ? (
          <>
            The application is currently operating in fallback mode. Your data is being stored temporarily 
            and may not persist if you close the application. We're attempting to reconnect to the database.
          </>
        ) : (
          <>
            Database connection issues detected. Some features may be temporarily unavailable.
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}