import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import StatsCard from "@/components/dashboard/StatsCard";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentDeals from "@/components/dashboard/RecentDeals";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import LeaderboardWidget from "@/components/dashboard/LeaderboardWidget";
import SectorDistributionChart from "@/components/dashboard/SectorDistributionChart";
import { formatCurrency } from "@/lib/utils/format";
import { 
  Activity, 
  TrendingUp, 
  Users, 
  DollarSign 
} from "lucide-react";

interface DashboardStats {
  activeDeals: number;
  activeDealsTrend: number;
  newDeals: number;
  newDealsTrend: number;
  inIcReview: number;
  icReviewTrend: number;
  totalAum: number;
  aumTrend: number;
}

export default function Dashboard() {
  const { data: stats = {} as DashboardStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  return (
    <AppLayout>
      <div className="p-6 pb-20">
        {/* Dashboard Overview */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
          {/* Quick Stats */}
          <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Active Deals"
              value={statsLoading ? "Loading..." : (stats?.activeDeals !== undefined ? stats.activeDeals.toString() : "0")}
              icon={<Activity className="h-6 w-6 text-primary" />}
              trend={statsLoading ? 0 : stats?.activeDealsTrend || 0}
              trendLabel="from last month"
              isLoading={statsLoading}
            />
            
            <StatsCard
              title="New Deals (30d)"
              value={statsLoading ? "Loading..." : (stats?.newDeals !== undefined ? stats.newDeals.toString() : "0")}
              icon={<TrendingUp className="h-6 w-6 text-accent" />}
              trend={statsLoading ? 0 : stats?.newDealsTrend || 0}
              trendLabel="from last month"
              isLoading={statsLoading}
            />
            
            <StatsCard
              title="In IC Review"
              value={statsLoading ? "Loading..." : (stats?.inIcReview !== undefined ? stats.inIcReview.toString() : "0")}
              icon={<Users className="h-6 w-6 text-info" />}
              trend={statsLoading ? 0 : stats?.icReviewTrend || 0}
              trendLabel="new this week"
              trendDirection="up"
              isLoading={statsLoading}
            />
            
            <StatsCard
              title="Total AUM"
              value={statsLoading ? "Loading..." : (stats?.totalAum !== undefined ? formatCurrency(stats.totalAum, true) : "$0")}
              icon={<DollarSign className="h-6 w-6 text-success" />}
              trend={statsLoading ? 0 : stats?.aumTrend || 0}
              trendLabel="Q2 performance"
              isLoading={statsLoading}
            />
          </div>
          
          {/* Quick Actions removed as requested */}
        </div>
        
        {/* Sector Distribution and Recent Deals */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
          <div className="lg:col-span-5 flex w-full">
            <SectorDistributionChart />
          </div>
          
          <div className="lg:col-span-7 flex w-full">
            <RecentDeals />
          </div>
        </div>
        
        {/* Activity Feed and Leaderboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-6 mt-8">
          <div className="sm:col-span-1 md:col-span-7 flex w-full">
            <ActivityFeed />
          </div>
          
          <div className="sm:col-span-1 md:col-span-5 flex w-full">
            <LeaderboardWidget />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
