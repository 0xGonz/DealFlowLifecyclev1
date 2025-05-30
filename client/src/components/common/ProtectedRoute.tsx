import { Route } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  path: string;
  component: () => JSX.Element;
  requiredRoles?: string | string[];
}

export default function ProtectedRoute({ 
  component: Component, 
  requiredRoles, 
  ...routeProps 
}: ProtectedRouteProps) {
  const { data: user, isLoading } = useAuth();

  return (
    <Route
      {...routeProps}
      component={() => {
        if (isLoading) {
          return (
            <div className="min-h-screen flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          );
        }

        if (!user) {
          return <Redirect to="/auth" />;
        }

        // Check role requirements if specified
        if (requiredRoles) {
          const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
          if (!rolesArray.includes(user.role)) {
            return <Redirect to="/" />;
          }
        }

        return <Component />;
      }}
    />
  );
}