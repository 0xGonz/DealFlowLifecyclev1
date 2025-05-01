import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, RotateCcw } from "lucide-react";
import { Deal } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { getDealStageBadgeClass } from "@/lib/utils/format";

export default function PassedPage() {
  const [, setLocation] = useLocation();
  
  // Fetch all deals
  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });
  
  // Filter deals to only show Passed stage
  const passedDeals = useMemo(() => {
    return deals.filter(deal => deal.stage === "passed");
  }, [deals]);
  
  // Calculate stage metrics
  const metrics = useMemo(() => {
    const totalDeals = passedDeals.length;
    
    // Group by sector
    const sectorCounts = passedDeals.reduce((acc, deal) => {
      acc[deal.sector] = (acc[deal.sector] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Sort sectors by count
    const topSectors = Object.entries(sectorCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 3)
      .map(([sector, count]) => ({ sector, count }));
    
    // Calculate passage rate
    const totalPipelineDeals = deals.length;
    const passageRate = totalPipelineDeals ? Math.round((totalDeals / totalPipelineDeals) * 100) : 0;
    
    return {
      totalDeals,
      passageRate,
      topSectors,
    };
  }, [passedDeals, deals]);
  
  // Handle row click to navigate to deal detail
  const handleRowClick = (dealId: number) => {
    setLocation(`/deals/${dealId}`);
  };
  
  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Passed Deals</h1>
          <Button onClick={() => setLocation("/pipeline")}>
            View All Pipeline
          </Button>
        </div>
        
        {/* Stage Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Passed</CardTitle>
              <CardDescription>Number of passed deals</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.totalDeals}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pass Rate</CardTitle>
              <CardDescription>Percentage of total deals passed</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.passageRate}%</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Top Sectors Passed</CardTitle>
              <CardDescription>Most common sectors passed on</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {metrics.topSectors.length > 0 ? (
                metrics.topSectors.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{item.sector}</span>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No sector data available</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Deals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Passed Deals</CardTitle>
            <CardDescription>
              These deals were passed on but may be revisited in the future
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : passedDeals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No passed deals</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>Round</TableHead>
                      <TableHead>Passed Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {passedDeals.map((deal) => {
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
                            {deal.round}
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(deal.id)}>
                            {formatDistanceToNow(new Date(deal.updatedAt), { addSuffix: true })}
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
