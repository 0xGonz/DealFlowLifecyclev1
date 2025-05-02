import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Star, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { LeaderboardItem } from "@/lib/types";
import { getDealStageBadgeClass } from "@/lib/utils/format";

export default function Leaderboard() {
  const [, navigate] = useLocation();
  
  const { data: leaderboardData = [], isLoading } = useQuery<LeaderboardItem[]>({
    queryKey: ['/api/leaderboard'],
  });

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto pb-20">
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-800 mb-4 sm:mb-6">Deal Leaderboard</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Deal Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="score">
              <TabsList className="mb-4">
                <TabsTrigger value="score">By Score</TabsTrigger>
                <TabsTrigger value="stars">By Stars</TabsTrigger>
              </TabsList>
              
              <TabsContent value="score">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px] sm:w-[60px] text-xs sm:text-sm">Rank</TableHead>
                        <TableHead className="text-xs sm:text-sm">Deal</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Score</TableHead>
                        <TableHead className="text-center text-xs sm:text-sm">Stars</TableHead>
                        <TableHead className="text-xs sm:text-sm">Stage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-neutral-500">
                            Loading leaderboard data...
                          </TableCell>
                        </TableRow>
                      ) : leaderboardData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-neutral-500">
                            No deals found for the leaderboard.
                          </TableCell>
                        </TableRow>
                      ) : (
                        leaderboardData.map((deal: LeaderboardItem, index: number) => (
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
                                <span className="text-base sm:text-lg font-semibold mr-1 sm:mr-2">{deal.score}</span>
                                {deal.change > 0 ? (
                                  <span className="text-success text-[10px] sm:text-xs flex items-center">
                                    <ArrowUp className="h-3 w-3 mr-0.5 sm:mr-1" />
                                    {deal.change}
                                  </span>
                                ) : deal.change < 0 ? (
                                  <span className="text-destructive text-[10px] sm:text-xs flex items-center">
                                    <ArrowDown className="h-3 w-3 mr-0.5 sm:mr-1" />
                                    {Math.abs(deal.change)}
                                  </span>
                                ) : (
                                  <span className="text-neutral-500 text-[10px] sm:text-xs">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-xs sm:text-sm py-2 sm:py-3">
                              <div className="flex items-center justify-center text-accent">
                                <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
                                <span className="ml-1 text-xs sm:text-sm">{deal.starCount}</span>
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
              </TabsContent>
              
              <TabsContent value="stars">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px] sm:w-[60px] text-xs sm:text-sm">Rank</TableHead>
                        <TableHead className="text-xs sm:text-sm">Deal</TableHead>
                        <TableHead className="text-center text-xs sm:text-sm">Stars</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Score</TableHead>
                        <TableHead className="text-xs sm:text-sm">Stage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-neutral-500">
                            Loading leaderboard data...
                          </TableCell>
                        </TableRow>
                      ) : leaderboardData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-neutral-500">
                            No deals found for the leaderboard.
                          </TableCell>
                        </TableRow>
                      ) : (
                        // Sort by star count for this tab
                        [...leaderboardData].sort((a, b) => b.starCount - a.starCount).map((deal: LeaderboardItem, index: number) => (
                          <TableRow 
                            key={deal.id} 
                            className="cursor-pointer hover:bg-neutral-50"
                            onClick={() => navigate(`/deals/${deal.id}`)}
                          >
                            <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-3">{index + 1}</TableCell>
                            <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-3 max-w-[120px] sm:max-w-none">
                              <div className="truncate">{deal.name}</div>
                            </TableCell>
                            <TableCell className="text-center text-xs sm:text-sm py-2 sm:py-3">
                              <div className="flex items-center justify-center text-accent">
                                <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
                                <span className="ml-1 text-xs sm:text-sm">{deal.starCount}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm py-2 sm:py-3">
                              <div className="flex items-center justify-end">
                                <span className="text-base sm:text-lg font-semibold">{deal.score}</span>
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}