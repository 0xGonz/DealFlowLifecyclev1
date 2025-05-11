import { ReactNode } from 'react';
import { Route, Redirect } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

/**
 * Props for the ProtectedRoute component
 * @typedef ProtectedRouteProps
 * @property {string} path - The route path (used with wouter)
 * @property {React.ComponentType<any>} [component] - Component to render if authenticated
 * @property {ReactNode} [children] - Children to render if authenticated (alternative to component)
 * @property {string|string[]} [requiredRoles] - Optional roles required to access this route
 */
interface ProtectedRouteProps {
  path?: string;
  component?: React.ComponentType<any>;
  children?: ReactNode;
  requiredRoles?: string | string[];
}

/**
 * Unified ProtectedRoute component that can be used in two ways:
 * 
 * 1. As a route wrapper with path and component:
 *    <ProtectedRoute path="/dashboard" component={Dashboard} />
 * 
 * 2. As a children wrapper with optional role restrictions:
 *    <Route path="/admin">
 *      <ProtectedRoute requiredRoles="admin">
 *        <AdminPanel />
 *      </ProtectedRoute>
 *    </Route>
 */
export function ProtectedRoute({ 
  path, 
  component: Component, 
  children,
  requiredRoles 
}: ProtectedRouteProps) {
  const { data: user, isLoading } = useAuth();
  
  // Create loading component (the same for both usage patterns)
  const LoadingComponent = () => (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
        <p className="text-neutral-600">Loading...</p>
      </div>
    </div>
  );

  // Show loading state while checking authentication
  if (isLoading) {
    return path ? (
      <Route path={path}>
        <LoadingComponent />
      </Route>
    ) : (
      <LoadingComponent />
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`ProtectedRoute: User not authenticated, redirecting to /auth`);
    }
    
    return path ? (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    ) : (
      <Redirect to="/auth" />
    );
  }
  
  // Role-based access control
  if (requiredRoles) {
    const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    
    if (!user.role || !allowedRoles.includes(user.role)) {
      // Redirect to unauthorized page
      return path ? (
        <Route path={path}>
          <Redirect to="/" />
        </Route>
      ) : (
        <Redirect to="/" />
      );
    }
  }

  // User is authenticated and authorized, render the component or children
  if (path && Component) {
    return (
      <Route path={path}>
        <Component />
      </Route>
    );
  }
  
  // If no path/component, just render children
  return <>{children}</>;
}
