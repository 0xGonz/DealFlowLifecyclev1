import { ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/lib/context/auth-context';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string | string[];
}

/**
 * Component that protects routes requiring authentication
 */
export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  
  // Show loading state if still checking authentication
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  // Role-based access control
  if (requiredRoles) {
    const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    
    if (!user.role || !allowedRoles.includes(user.role)) {
      // Redirect to unauthorized page or dashboard
      return <Redirect to="/unauthorized" />;
    }
  }
  
  // Render children if authenticated and authorized
  return <>{children}</>;
}
