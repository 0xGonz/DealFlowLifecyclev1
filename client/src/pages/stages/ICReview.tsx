import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ChevronRight, FileText, Users } from "lucide-react";
import { Deal } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { getDealStageBadgeClass } from "@/lib/utils/format";

export default function ICReviewPage() {
  const [, setLocation] = useLocation();
  
  // Fetch all deals
  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });
  
  // Filter deals to only show IC Review stage
  const icReviewDeals = useMemo(() => {
    return deals.filter(deal => deal.stage === "ic_review");
  }, [deals]);
  
  // Calculate stage metrics
  const metrics = useMemo(() => {
    const totalDeals = icReviewDeals.length;
    const avgDaysInStage = icReviewDeals.reduce((sum, deal) => {
      const createdAt = new Date(deal.createdAt);
      const now = new Date();
      const daysInStage = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return sum + daysInStage;
    }, 0) / (totalDeals || 1);
    
    // Calculate how many deals have at least one mini-memo
    const dealsWithMemos = icReviewDeals.filter(deal => 
      deal.miniMemos && deal.miniMemos.length > 0
    ).length;
    
    const memoCompletionRate = totalDeals ? 
      Math.round((dealsWithMemos / totalDeals) * 100) : 0;
    
    return {
      totalDeals,
      avgDaysInStage: avgDaysInStage.toFixed(1),
      memoCompletionRate,
    };
  }, [icReviewDeals]);
  
  // Handle row click to navigate to deal detail
  const handleRowClick = (dealId: number) => {
    setLocation(`/deals/${dealId}`);
  };
  
  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Investment Committee Review</h1>
          <Button onClick={() => setLocation("/pipeline")}>
            View All Pipeline
          </Button>
        </div>
        
        {/* Stage Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Deals</CardTitle>
              <CardDescription>Deals in IC Review stage</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.totalDeals}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Avg. Time in Stage</CardTitle>
              <CardDescription>Average days in IC Review</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.avgDaysInStage} days</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Memo Completion</CardTitle>
              <CardDescription>Deals with investment memos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.memoCompletionRate}%</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Deals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Deals in IC Review</CardTitle>
            <CardDescription>
              These deals are being reviewed by the Investment Committee
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : icReviewDeals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No deals in IC Review stage</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>Memo Status</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Days in Stage</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {icReviewDeals.map((deal) => {
                      const createdAt = new Date(deal.createdAt);
                      const now = new Date();
                      const daysInStage = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
                      const memoCount = deal.miniMemos?.length || 0;
                      const assignedCount = deal.assignedUsers?.length || 0;
                      
                      return (
                        <TableRow 
                          key={deal.id} 
                          className="cursor-pointer hover:bg-muted"
                        >
                          <TableCell onClick={() => handleRowClick(deal.id)}>
                            <div>
                              <p className="font-medium">{deal.name}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                                {deal.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(deal.id)}>
                            {deal.sector}
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(deal.id)}>
                            <Badge variant={memoCount > 0 ? "default" : "outline"}>
                              {memoCount} memo{memoCount !== 1 ? 's' : ''}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(deal.id)}>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                              {assignedCount} team member{assignedCount !== 1 ? 's' : ''}
                            </div>
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(deal.id)}>
                            {daysInStage} day{daysInStage !== 1 ? 's' : ''}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleRowClick(deal.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/deals/${deal.id}?tab=memos`);
                                }}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/deals/${deal.id}?tab=workflow`);
                                }}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
