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
import TeamPage from "@/pages/TeamPage";
import CapitalCalls from "@/pages/CapitalCalls";
import AuthPage from "@/pages/auth-page";
import { AuthProvider } from "@/hooks/use-auth";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/pipeline" component={Pipeline} />
      <ProtectedRoute path="/leaderboard" component={Leaderboard} />
      <ProtectedRoute path="/funds" component={Funds} />
      <ProtectedRoute path="/funds/:id" component={FundDetail} />
      <ProtectedRoute path="/deals/:id" component={DealDetail} />
      <ProtectedRoute path="/team" component={TeamPage} />
      <ProtectedRoute path="/capital-calls" component={CapitalCalls} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
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
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
