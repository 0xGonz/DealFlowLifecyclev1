import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import StatsCard from "@/components/dashboard/StatsCard";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentDeals from "@/components/dashboard/RecentDeals";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import LeaderboardWidget from "@/components/dashboard/LeaderboardWidget";
import { formatCurrency } from "@/lib/utils/format";
import { 
  Activity, 
  TrendingUp, 
  Users, 
  DollarSign 
} from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        {/* Dashboard Overview */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
          {/* Quick Stats */}
          <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard
              title="Active Deals"
              value={statsLoading ? "Loading..." : stats?.activeDeals.toString() || "0"}
              icon={<Activity className="h-6 w-6 text-primary" />}
              trend={statsLoading ? 0 : stats?.activeDealsTrend || 0}
              trendLabel="from last month"
              isLoading={statsLoading}
            />
            
            <StatsCard
              title="New Deals (30d)"
              value={statsLoading ? "Loading..." : stats?.newDeals.toString() || "0"}
              icon={<TrendingUp className="h-6 w-6 text-accent" />}
              trend={statsLoading ? 0 : stats?.newDealsTrend || 0}
              trendLabel="from last month"
              isLoading={statsLoading}
            />
            
            <StatsCard
              title="In IC Review"
              value={statsLoading ? "Loading..." : stats?.inIcReview.toString() || "0"}
              icon={<Users className="h-6 w-6 text-info" />}
              trend={statsLoading ? 0 : stats?.icReviewTrend || 0}
              trendLabel="new this week"
              trendDirection="up"
              isLoading={statsLoading}
            />
            
            <StatsCard
              title="Total AUM"
              value={statsLoading ? "Loading..." : formatCurrency(stats?.totalAum || 0, true) || "$0"}
              icon={<DollarSign className="h-6 w-6 text-success" />}
              trend={statsLoading ? 0 : stats?.aumTrend || 0}
              trendLabel="Q2 performance"
              isLoading={statsLoading}
            />
          </div>
          
          {/* Quick Actions */}
          <div className="md:col-span-3">
            <QuickActions />
          </div>
        </div>
        
        {/* Recent Deals */}
        <RecentDeals />
        
        {/* Activity Feed and Leaderboard */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-8">
          <div className="md:col-span-7">
            <ActivityFeed />
          </div>
          
          <div className="md:col-span-5">
            <LeaderboardWidget />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
