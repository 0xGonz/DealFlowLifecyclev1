import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ChevronRight, DollarSign } from "lucide-react";
import { Deal } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { getDealStageBadgeClass } from "@/lib/utils/format";

export default function ClosingPage() {
  const [, setLocation] = useLocation();
  
  // Fetch all deals
  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });
  
  // Filter deals to only show Closing stage
  const closingDeals = useMemo(() => {
    return deals.filter(deal => deal.stage === "closing");
  }, [deals]);
  
  // Calculate stage metrics
  const metrics = useMemo(() => {
    const totalDeals = closingDeals.length;
    const avgDaysInStage = closingDeals.reduce((sum, deal) => {
      const createdAt = new Date(deal.createdAt);
      const now = new Date();
      const daysInStage = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return sum + daysInStage;
    }, 0) / (totalDeals || 1);
    
    // Calculate total expected investment amount
    const totalAmount = closingDeals.reduce((sum, deal) => {
      if (deal.targetRaise) {
        // Extract numerical value from targetRaise (assuming format like "$5M" or "10M")
        const match = deal.targetRaise.match(/\$?(\d+(\.\d+)?)[mM]?/);
        if (match) {
          let amount = parseFloat(match[1]);
          // If the amount is in millions (contains 'M' or 'm')
          if (deal.targetRaise.toLowerCase().includes('m')) {
            amount *= 1000000;
          }
          return sum + amount;
        }
      }
      return sum;
    }, 0);
    
    return {
      totalDeals,
      avgDaysInStage: avgDaysInStage.toFixed(1),
      totalAmount: (totalAmount / 1000000).toFixed(2), // Convert to millions
    };
  }, [closingDeals]);
  
  // Handle row click to navigate to deal detail
  const handleRowClick = (dealId: number) => {
    setLocation(`/deals/${dealId}`);
  };
  
  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Closing</h1>
          <Button onClick={() => setLocation("/pipeline")}>
            View All Pipeline
          </Button>
        </div>
        
        {/* Stage Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Deals</CardTitle>
              <CardDescription>Deals in Closing stage</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.totalDeals}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Investment</CardTitle>
              <CardDescription>Expected investment amount</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">${metrics.totalAmount}M</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Avg. Time to Close</CardTitle>
              <CardDescription>Average days in Closing stage</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.avgDaysInStage} days</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Deals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Deals in Closing</CardTitle>
            <CardDescription>
              These deals are in the final stages of closing the investment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : closingDeals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No deals in Closing stage</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Target Raise</TableHead>
                      <TableHead>Valuation</TableHead>
                      <TableHead>Lead Investor</TableHead>
                      <TableHead>Days in Stage</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closingDeals.map((deal) => {
                      const createdAt = new Date(deal.createdAt);
                      const now = new Date();
                      const daysInStage = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
                      
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
                            {deal.targetRaise || 'Not specified'}
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(deal.id)}>
                            {deal.valuation || 'Not specified'}
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(deal.id)}>
                            {deal.leadInvestor || 'Not specified'}
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
                                  setLocation(`/deals/${deal.id}?tab=allocation`);
                                }}
                              >
                                <DollarSign className="h-4 w-4" />
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
