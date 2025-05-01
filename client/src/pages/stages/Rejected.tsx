import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, XCircle, RotateCcw } from "lucide-react";
import { Deal } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { getDealStageBadgeClass } from "@/lib/utils/format";

// Helper to group rejection reasons
const getTopRejectionReasons = (deals: any[], limit = 3) => {
  const reasonsMap = new Map<string, number>();
  
  deals.forEach(deal => {
    if (deal.rejectionReason) {
      // Normalize and truncate long rejection reasons
      const normalizedReason = deal.rejectionReason.substring(0, 50);
      reasonsMap.set(normalizedReason, (reasonsMap.get(normalizedReason) || 0) + 1);
    }
  });
  
  // Sort by count and take top reasons
  return Array.from(reasonsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([reason, count]) => ({ reason, count }));
};

export default function RejectedPage() {
  const [, setLocation] = useLocation();
  
  // Fetch all deals
  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });
  
  // Filter deals to only show Rejected stage
  const rejectedDeals = useMemo(() => {
    return deals.filter(deal => deal.stage === "rejected");
  }, [deals]);
  
  // Calculate stage metrics and top rejection reasons
  const metrics = useMemo(() => {
    const totalDeals = rejectedDeals.length;
    const topReasons = getTopRejectionReasons(rejectedDeals);
    
    // Calculate rejection rate
    const totalPipelineDeals = deals.length;
    const rejectionRate = totalPipelineDeals ? Math.round((totalDeals / totalPipelineDeals) * 100) : 0;
    
    return {
      totalDeals,
      rejectionRate,
      topReasons,
    };
  }, [rejectedDeals, deals]);
  
  // Handle row click to navigate to deal detail
  const handleRowClick = (dealId: number) => {
    setLocation(`/deals/${dealId}`);
  };
  
  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Rejected Deals</h1>
          <Button onClick={() => setLocation("/pipeline")}>
            View All Pipeline
          </Button>
        </div>
        
        {/* Stage Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Rejected</CardTitle>
              <CardDescription>Number of rejected deals</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.totalDeals}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Rejection Rate</CardTitle>
              <CardDescription>Percentage of total deals rejected</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.rejectionRate}%</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Top Rejection Reasons</CardTitle>
              <CardDescription>Most common reasons for rejection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {metrics.topReasons.length > 0 ? (
                metrics.topReasons.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm truncate max-w-[200px]">{item.reason}</span>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No rejection reasons found</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Deals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Rejected Deals</CardTitle>
            <CardDescription>
              These deals have been rejected from the investment process
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : rejectedDeals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No rejected deals</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>Rejection Reason</TableHead>
                      <TableHead>Rejected Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedDeals.map((deal) => {
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
                            <div className="max-w-[250px] truncate">
                              {deal.rejectionReason || 'No reason provided'}
                            </div>
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(deal.id)}>
                            {deal.rejectedAt ? (
                              formatDistanceToNow(new Date(deal.rejectedAt), { addSuffix: true })
                            ) : (
                              formatDistanceToNow(new Date(deal.updatedAt), { addSuffix: true })
                            )}
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
                                  setLocation(`/deals/${deal.id}?tab=workflow`);
                                }}
                              >
                                <RotateCcw className="h-4 w-4" />
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
