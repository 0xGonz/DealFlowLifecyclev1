import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/services/api';

/**
 * Custom hook for working with dashboard data
 */
export function useDashboard() {
  // Dashboard statistics
  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    staleTime: 60000, // 1 minute
  });

  // Sector distribution statistics
  const {
    data: sectorStats,
    isLoading: isLoadingSectorStats,
    error: sectorStatsError,
    refetch: refetchSectorStats
  } = useQuery({
    queryKey: ['/api/dashboard/sector-stats'],
    staleTime: 60000, // 1 minute
  });

  // Activity feed data
  const {
    data: activity,
    isLoading: isLoadingActivity,
    error: activityError,
    refetch: refetchActivity
  } = useQuery({
    queryKey: ['/api/activity'],
    staleTime: 30000, // 30 seconds
  });

  // Leaderboard data
  const {
    data: leaderboard,
    isLoading: isLoadingLeaderboard,
    error: leaderboardError,
    refetch: refetchLeaderboard
  } = useQuery({
    queryKey: ['/api/leaderboard'],
    staleTime: 60000, // 1 minute
  });

  return {
    stats,
    isLoadingStats,
    statsError,
    refetchStats,

    sectorStats,
    isLoadingSectorStats,
    sectorStatsError,
    refetchSectorStats,
    
    activity,
    isLoadingActivity,
    activityError,
    refetchActivity,
    
    leaderboard,
    isLoadingLeaderboard,
    leaderboardError,
    refetchLeaderboard,

    // Helper method to refetch all dashboard data
    refetchAll: () => {
      refetchStats();
      refetchSectorStats();
      refetchActivity();
      refetchLeaderboard();
    }
  };
}
