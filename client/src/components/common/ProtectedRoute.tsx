import { ReactNode, useEffect } from 'react';
import { Route, Redirect, useParams } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { data, isLoading, refreshAuth } = useAuth();

  // Add debugging logs
  console.log(`ProtectedRoute for ${path}: isLoading=${isLoading}, user=${data?.username}`);

  // Refresh auth on mount to ensure we have fresh authentication data
  useEffect(() => {
    console.log(`ProtectedRoute ${path} mounted, refreshing auth`);
    refreshAuth();
  }, [path, refreshAuth]);

  // Show a loading state while checking authentication
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen bg-neutral-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-neutral-600">Loading...</p>
          </div>
        </div>
      </Route>
    );
  }

  // If not authenticated, redirect to login
  if (!data) {
    console.log(`ProtectedRoute ${path}: User not authenticated, redirecting to /auth`);
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // User is authenticated, render the component
  console.log(`ProtectedRoute ${path}: Rendering component for user ${data.username}`);
  return <Route path={path}>
    <Component />
  </Route>;
}
