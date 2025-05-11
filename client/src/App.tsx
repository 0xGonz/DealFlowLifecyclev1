import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Pipeline from "@/pages/Pipeline";
import Leaderboard from "@/pages/Leaderboard";
import Funds from "@/pages/Funds";
import FundDetail from "@/pages/FundDetail";
import DealDetail from "@/pages/DealDetail";
import Calendar from "@/pages/Calendar";
import Settings from "@/pages/Settings";
import Users from "@/pages/Users";
import AuthPage from "@/pages/auth-page";
import StarTest from "@/pages/StarTest";
import CapitalCalls from "@/pages/CapitalCalls";
import CapitalCallsByAllocation from "@/pages/CapitalCallsByAllocation";
import { AuthProvider } from "@/hooks/use-auth";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { DatabaseStatusAlert } from "@/components/system/DatabaseStatusAlert";

/**
 * Wraps a component with an ErrorBoundary for route-level error handling
 */
const withErrorBoundary = (Component: React.ComponentType<any>, pageName: string) => (props: any) => (
  <ErrorBoundary
    onError={(error, info) => {
      console.error(`Error in ${pageName} page:`, error, info);
      // Could send to an error reporting service here
    }}
    fallback={
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">We encountered an error loading this page.</p>
        <a 
          href="/"
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
        >
          Return to Dashboard
        </a>
      </div>
    }
  >
    <Component {...props} />
  </ErrorBoundary>
);

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={withErrorBoundary(Dashboard, 'Dashboard')} />
      <ProtectedRoute path="/pipeline" component={withErrorBoundary(Pipeline, 'Pipeline')} />
      <ProtectedRoute path="/leaderboard" component={withErrorBoundary(Leaderboard, 'Leaderboard')} />
      <ProtectedRoute path="/funds" component={withErrorBoundary(Funds, 'Funds')} />
      <ProtectedRoute path="/funds/:id" component={withErrorBoundary(FundDetail, 'FundDetail')} />
      <ProtectedRoute path="/deals/:id" component={withErrorBoundary(DealDetail, 'DealDetail')} />
      <ProtectedRoute path="/calendar" component={withErrorBoundary(Calendar, 'Calendar')} />
      <ProtectedRoute path="/capital-calls" component={withErrorBoundary(CapitalCalls, 'CapitalCalls')} />
      <ProtectedRoute 
        path="/capital-calls/allocation/:id" 
        component={withErrorBoundary(CapitalCallsByAllocation, 'CapitalCallsByAllocation')} 
      />
      <ProtectedRoute path="/settings" component={withErrorBoundary(Settings, 'Settings')} />
      <ProtectedRoute path="/users" component={withErrorBoundary(Users, 'Users')} />
      <Route path="/auth" component={withErrorBoundary(AuthPage, 'AuthPage')} />
      <Route path="/startest" component={withErrorBoundary(StarTest, 'StarTest')} />
      <Route component={withErrorBoundary(NotFound, 'NotFound')} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary
      onError={(error, info) => {
        console.error("Global error caught by ErrorBoundary:", error, info);
        // Here we could send to an error reporting service like Sentry
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <DatabaseStatusAlert />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
