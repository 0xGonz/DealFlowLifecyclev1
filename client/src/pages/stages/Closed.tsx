import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, DollarSign, PiggyBank } from "lucide-react";
import { Deal } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { getDealStageBadgeClass } from "@/lib/utils/format";

export default function ClosedPage() {
  const [, setLocation] = useLocation();
  
  // Fetch all deals
  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });
  
  // Fetch all funds
  const { data: funds = [] } = useQuery({
    queryKey: ["/api/funds"],
  });
  
  // Filter deals to only show Closed stage
  const closedDeals = useMemo(() => {
    return deals.filter(deal => deal.stage === "closed");
  }, [deals]);
  
  // Calculate stage metrics
  const metrics = useMemo(() => {
    const totalDeals = closedDeals.length;
    
    // Calculate total invested amount
    const totalInvested = closedDeals.reduce((sum, deal) => {
      // Sum up all allocations for the deal
      const allocations = deal.allocations || [];
      const dealTotal = allocations.reduce((dealSum, allocation) => dealSum + allocation.amount, 0);
      return sum + dealTotal;
    }, 0);
    
    // Count how many deals have fund allocations
    const dealsWithAllocations = closedDeals.filter(deal => 
      deal.allocations && deal.allocations.length > 0
    ).length;
    
    return {
      totalDeals,
      totalInvested: (totalInvested / 1000000).toFixed(2), // Convert to millions
      allocationRate: totalDeals ? Math.round((dealsWithAllocations / totalDeals) * 100) : 0,
    };
  }, [closedDeals]);
  
  // Handle row click to navigate to deal detail
  const handleRowClick = (dealId: number) => {
    setLocation(`/deals/${dealId}`);
  };
  
  // Helper to find fund name
  const getFundName = (fundId: number) => {
    const fund = funds.find(f => f.id === fundId);
    return fund ? fund.name : 'Unknown Fund';
  };
  
  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Closed Investments</h1>
          <Button onClick={() => setLocation("/pipeline")}>
            View All Pipeline
          </Button>
        </div>
        
        {/* Stage Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Investments</CardTitle>
              <CardDescription>Number of closed deals</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.totalDeals}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Invested</CardTitle>
              <CardDescription>Total invested capital</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">${metrics.totalInvested}M</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Fund Allocation</CardTitle>
              <CardDescription>Deals allocated to funds</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.allocationRate}%</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Deals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Closed Investments</CardTitle>
            <CardDescription>
              These deals have been successfully closed and invested
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : closedDeals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No closed investments</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>Investment Amount</TableHead>
                      <TableHead>Allocated To</TableHead>
                      <TableHead>Closed Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closedDeals.map((deal) => {
                      const allocations = deal.allocations || [];
                      const totalAmount = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
                      const formattedAmount = new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 0,
                        notation: 'compact',
                      }).format(totalAmount);
                      
                      // Get unique funds allocated to
                      const fundIds = [...new Set(allocations.map(a => a.fundId))];
                      
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
                            <span className="font-medium">{formattedAmount}</span>
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(deal.id)}>
                            {fundIds.length > 0 ? (
                              <div>
                                {fundIds.map((fundId) => (
                                  <Badge key={fundId} variant="outline" className="mr-1">
                                    {getFundName(fundId)}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Not allocated</span>
                            )}
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(deal.id)}>
                            {deal.updatedAt ? (
                              formatDistanceToNow(new Date(deal.updatedAt), { addSuffix: true })
                            ) : (
                              'Unknown'
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
                                  setLocation(`/deals/${deal.id}?tab=allocation`);
                                }}
                              >
                                <DollarSign className="h-4 w-4" />
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
