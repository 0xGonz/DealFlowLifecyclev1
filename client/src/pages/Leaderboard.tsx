import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import DealStar from "@/components/deals/DealStar";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { LeaderboardItem, UserLeaderboardItem, CategoryLeader } from "@/lib/types";
import { getDealStageBadgeClass, formatPercentage } from "@/lib/utils/format";
import { FINANCIAL_CALCULATION } from "@/lib/constants/calculation-constants";

// Import our new leaderboard components
import LeaderboardTabs from "@/components/leaderboard/LeaderboardTabs";
import TimePeriodFilter from "@/components/leaderboard/TimePeriodFilter";
import UserRankCard from "@/components/leaderboard/UserRankCard";
import CategoryLeadersCard from "@/components/leaderboard/CategoryLeadersCard";

// Mock data for demonstration purposes - will be replaced with real API calls
const mockUserLeaderboard: UserLeaderboardItem[] = [
  {
    id: 1,
    userId: 1,
    fullName: "Jane Smith",
    role: "analyst",
    avatarColor: "#4F46E5",
    initials: "JS",
    totalPoints: 145,
    previousPoints: 120,
    trend: 25,
    pointsBreakdown: {
      starsGiven: 18,
      assignmentsCompleted: 24,
      documentsUploaded: 40,
      memosWritten: 30,
      timelineUpdates: 25,
      commentsAdded: 8
    },
    topCategories: ["Document", "Assignment"],
    lastActiveDate: "2025-05-05T14:30:00.000Z"
  },
  {
    id: 2,
    userId: 2,
    fullName: "Michael Johnson",
    role: "partner",
    avatarColor: "#0EA5E9",
    initials: "MJ",
    totalPoints: 132,
    previousPoints: 140,
    trend: -8,
    pointsBreakdown: {
      starsGiven: 24,
      assignmentsCompleted: 18,
      documentsUploaded: 20,
      memosWritten: 45,
      timelineUpdates: 15,
      commentsAdded: 10
    },
    topCategories: ["Memo"],
    lastActiveDate: "2025-05-08T09:15:00.000Z"
  },
  {
    id: 3,
    userId: 3,
    fullName: "Alex Rodriguez",
    role: "analyst",
    avatarColor: "#10B981",
    initials: "AR",
    totalPoints: 120,
    previousPoints: 95,
    trend: 25,
    pointsBreakdown: {
      starsGiven: 32,
      assignmentsCompleted: 15,
      documentsUploaded: 28,
      memosWritten: 12,
      timelineUpdates: 22,
      commentsAdded: 11
    },
    topCategories: ["Star", "Timeline"],
    lastActiveDate: "2025-05-07T16:45:00.000Z"
  }
];

const mockCategoryLeaders: CategoryLeader[] = [
  {
    categoryName: "Most Documents",
    categoryId: "documents",
    user: {
      id: 1,
      fullName: "Jane Smith",
      initials: "JS",
      avatarColor: "#4F46E5"
    },
    count: 40
  },
  {
    categoryName: "Most Memos",
    categoryId: "memos",
    user: {
      id: 2,
      fullName: "Michael Johnson",
      initials: "MJ",
      avatarColor: "#0EA5E9"
    },
    count: 45
  },
  {
    categoryName: "Most Stars Given",
    categoryId: "stars",
    user: {
      id: 3,
      fullName: "Alex Rodriguez",
      initials: "AR",
      avatarColor: "#10B981"
    },
    count: 32
  },
  {
    categoryName: "Most Assignments",
    categoryId: "assignments",
    user: {
      id: 1,
      fullName: "Jane Smith",
      initials: "JS",
      avatarColor: "#4F46E5"
    },
    count: 24
  }
];

export default function Leaderboard() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("users");
  const [timePeriod, setTimePeriod] = useState<string>("month");
  
  // Deal leaderboard query
  const { data: dealLeaderboardData = [], isLoading: isLoadingDeals } = useQuery<LeaderboardItem[]>({
    queryKey: ['/api/leaderboard/deals', timePeriod],
  });
  
  // User leaderboard query - Would be replaced with real API call
  const { data: userLeaderboardData = mockUserLeaderboard, isLoading: isLoadingUsers } = useQuery<UserLeaderboardItem[]>({
    queryKey: ['/api/leaderboard/users', timePeriod],
    // This would be the real API call in production
    // enabled: activeTab === 'users',
    enabled: false, // Disabled for now while using mock data
  });
  
  // Category leaders query - Would be replaced with real API call
  const { data: categoryLeadersData = mockCategoryLeaders, isLoading: isLoadingCategories } = useQuery<CategoryLeader[]>({
    queryKey: ['/api/leaderboard/categories', timePeriod],
    enabled: false, // Disabled for now while using mock data
  });

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-800">Investment Diligence Leaderboard</h1>
          <TimePeriodFilter period={timePeriod} onChange={setTimePeriod} />
        </div>
        
        <LeaderboardTabs activeTab={activeTab} onChange={setActiveTab}>
          {/* Team Rankings Tab */}
          <TabsContent value="users" className="space-y-6 mt-2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Overall Rankings</CardTitle>
                    <CardDescription>Team members ranked by diligence activity</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 py-0 sm:py-2">
                    {isLoadingUsers ? (
                      <div className="py-8 text-center text-neutral-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p>Loading user rankings...</p>
                      </div>
                    ) : userLeaderboardData.length === 0 ? (
                      <div className="py-8 text-center text-neutral-500">
                        <p>No user activity data available.</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 pb-4">
                        {userLeaderboardData.map((user, index) => (
                          <UserRankCard
                            key={user.id}
                            user={user}
                            rank={index + 1}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <CategoryLeadersCard categories={categoryLeadersData} />
              </div>
            </div>
          </TabsContent>

          {/* Deal Activity Tab */}
          <TabsContent value="deals" className="mt-2">
            <Card>
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                <CardTitle className="text-base sm:text-lg">Deal Activity Rankings</CardTitle>
                <CardDescription>
                  Deals ranked by team diligence activity and engagement
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 py-3 sm:py-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px] sm:w-[60px] text-xs sm:text-sm">Rank</TableHead>
                        <TableHead className="text-xs sm:text-sm">Deal</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Activity Score</TableHead>
                        <TableHead className="text-center text-xs sm:text-sm">Stars</TableHead>
                        <TableHead className="text-xs sm:text-sm">Stage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingDeals ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 sm:py-10 text-neutral-500">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                            <p className="text-sm">Loading deal activity data...</p>
                          </TableCell>
                        </TableRow>
                      ) : dealLeaderboardData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 sm:py-10 text-neutral-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-neutral-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                            <p className="text-sm">No deals found for the leaderboard.</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        dealLeaderboardData.map((deal: LeaderboardItem, index: number) => (
                          <TableRow 
                            key={deal.id} 
                            className="cursor-pointer hover:bg-neutral-50"
                            onClick={() => navigate(`/deals/${deal.id}`)}
                          >
                            <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-3">{index + 1}</TableCell>
                            <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-3 max-w-[120px] sm:max-w-none">
                              <div className="truncate">{deal.name}</div>
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm py-2 sm:py-3">
                              <div className="flex items-center justify-end">
                                <span className="text-base sm:text-lg font-semibold">{typeof deal.score === 'number' ? formatPercentage(deal.score, FINANCIAL_CALCULATION.PRECISION.PERCENTAGE) : deal.score}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-xs sm:text-sm py-2 sm:py-3">
                              <div className="flex justify-center">
                                <DealStar count={deal.starCount} size="sm" className="justify-center" />
                              </div>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm py-2 sm:py-3">
                              <span className={`deal-stage-badge text-[10px] sm:text-xs py-1 px-1.5 sm:px-2 ${getDealStageBadgeClass(deal.stage)}`}>
                                {deal.stageLabel}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </LeaderboardTabs>
      </div>
    </AppLayout>
  );
}
