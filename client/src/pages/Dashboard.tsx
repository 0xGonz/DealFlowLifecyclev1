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
  DollarSign,
  LineChart,
  BarChart
} from "lucide-react";

interface DashboardStats {
  totalDeals: number;
  totalDealsTrend: number;
  activeDeals: number;
  activePipelinePercent: number;
  activePipelineTrend: number;
  newDeals: number;
  newDealsPercent: number;
  newDealsTrend: number;
  inIcReview: number;
  icReviewPercent: number;
  icReviewTrend: number;
  investedDeals: number;
  investmentRate: number;
  investmentRateTrend: number;
  totalAum: number;
  aumTrend?: number;
}

export default function Dashboard() {
  const { data: stats = {} as DashboardStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 pb-20">
        {/* Dashboard Overview */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Quick Stats */}
          <div className="md:col-span-12 lg:col-span-12 grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatsCard
              title="Total Deals"
              value={statsLoading ? "Loading..." : (stats?.totalDeals !== undefined ? stats.totalDeals.toString() : "0")}
              icon={<Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />}
              trend={statsLoading ? 0 : stats?.totalDealsTrend || 0}
              trendLabel="from last month"
              isLoading={statsLoading}
            />
            
            <StatsCard
              title="Active Pipeline"
              value={statsLoading ? "Loading..." : (stats?.activePipelinePercent !== undefined ? `${stats.activePipelinePercent}%` : "0%")}
              icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />}
              trend={statsLoading ? 0 : stats?.activePipelineTrend || 0}
              trendLabel="of total pipeline"
              isLoading={statsLoading}
            />
            
            <StatsCard
              title="New Deals"
              value={statsLoading ? "Loading..." : (stats?.newDealsPercent !== undefined ? `${stats.newDealsPercent}%` : "0%")}
              icon={<LineChart className="h-5 w-5 sm:h-6 sm:w-6 text-info" />}
              trend={statsLoading ? 0 : stats?.newDealsTrend || 0}
              trendLabel="of total pipeline"
              trendDirection="up"
              isLoading={statsLoading}
            />
            
            <StatsCard
              title="In IC Review"
              value={statsLoading ? "Loading..." : (stats?.icReviewPercent !== undefined ? `${stats.icReviewPercent}%` : "0%")}
              icon={<Users className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />}
              trend={statsLoading ? 0 : stats?.icReviewTrend || 0}
              trendLabel="of total pipeline"
              isLoading={statsLoading}
            />
            
            <StatsCard
              title="Investment Rate"
              value={statsLoading ? "Loading..." : (stats?.investmentRate !== undefined ? `${stats.investmentRate}%` : "0%")}
              icon={<DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-success" />}
              trend={statsLoading ? 0 : stats?.investmentRateTrend || 0}
              trendLabel="of total deals"
              isLoading={statsLoading}
            />
          </div>
          
          {/* Quick Actions removed as requested */}
        </div>
        
        {/* Sector Distribution and Recent Deals */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 mt-6 sm:mt-8">
          <div className="lg:col-span-5 flex w-full">
            <SectorDistributionChart />
          </div>
          
          <div className="lg:col-span-7 flex w-full">
            <RecentDeals />
          </div>
        </div>
        
        {/* Activity Feed and Leaderboard */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 mt-6 sm:mt-8">
          <div className="md:col-span-7 flex w-full">
            <ActivityFeed />
          </div>
          
          <div className="md:col-span-5 flex w-full">
            <LeaderboardWidget />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
