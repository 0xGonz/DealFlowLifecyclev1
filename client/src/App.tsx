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
import { AuthProvider } from "@/lib/context/auth-context";
import ErrorBoundary from "@/components/common/ErrorBoundary";

// Import stage pages
import InitialReview from "@/pages/stages/InitialReview";
import Screening from "@/pages/stages/Screening";
import Diligence from "@/pages/stages/Diligence";
import ICReview from "@/pages/stages/ICReview";
import Closing from "@/pages/stages/Closing";
import Closed from "@/pages/stages/Closed";
import Rejected from "@/pages/stages/Rejected";
import Passed from "@/pages/stages/Passed";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/funds" component={Funds} />
      <Route path="/funds/:id" component={FundDetail} />
      <Route path="/deals/:id" component={DealDetail} />
      
      {/* Stage specific routes */}
      <Route path="/stages/initial-review" component={InitialReview} />
      <Route path="/stages/screening" component={Screening} />
      <Route path="/stages/diligence" component={Diligence} />
      <Route path="/stages/ic-review" component={ICReview} />
      <Route path="/stages/closing" component={Closing} />
      <Route path="/stages/closed" component={Closed} />
      <Route path="/stages/rejected" component={Rejected} />
      <Route path="/stages/passed" component={Passed} />
      
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
