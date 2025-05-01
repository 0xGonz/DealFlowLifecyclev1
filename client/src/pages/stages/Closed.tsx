import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, FileText, PiggyBank } from "lucide-react";
import { Deal } from "@/lib/types";
import { format, formatDistanceToNow } from "date-fns";
import { getDealStageBadgeClass } from "@/lib/utils/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ClosedPage() {
  const [, setLocation] = useLocation();
  
  // Fetch all deals
  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });
  
  // Filter deals to only show Closed stage
  const closedDeals = useMemo(() => {
    return deals.filter(deal => deal.stage === "closed");
  }, [deals]);
  
  // Calculate metrics for the stage
  const metrics = useMemo(() => {
    // Count deals
    const totalDeals = closedDeals.length;
    
    // Calculate total invested amount
    const totalInvested = closedDeals.reduce((sum, deal) => {
      if (deal.committedAmount) {
        // Remove any non-numeric characters and parse as float
        const cleanedValue = deal.committedAmount.replace(/[^0-9.]/g, '');
        const numValue = parseFloat(cleanedValue);
        return isNaN(numValue) ? sum : sum + numValue;
      }
      return sum;
    }, 0);
    
    // Group by sector
    const sectorCounts = closedDeals.reduce((acc, deal) => {
      acc[deal.sector] = (acc[deal.sector] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Convert to chart data
    const sectorData = Object.entries(sectorCounts).map(([name, value]) => ({ name, value }));
    
    return {
      totalDeals,
      totalInvested: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
        minimumFractionDigits: 0
      }).format(totalInvested * 1000000), // Assuming values are in millions
      sectorData
    };
  }, [closedDeals]);
  
  // Handle row click to navigate to deal detail
  const handleRowClick = (dealId: number) => {
    setLocation(`/deals/${dealId}`);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Closed Deals</CardTitle>
              <CardDescription>Number of deals that have closed</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.totalDeals}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Investment</CardTitle>
              <CardDescription>Total amount committed to closed deals</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.totalInvested}</p>
            </CardContent>
          </Card>
          
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Investments by Sector</CardTitle>
              <CardDescription>Distribution of closed deals by sector</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {metrics.sectorData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    width={500}
                    height={300}
                    data={metrics.sectorData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Deals Closed" fill="#146C3C" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground h-full flex items-center justify-center">
                  No sector data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Deals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Closed Deals</CardTitle>
            <CardDescription>
              These deals have successfully completed the investment process
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : closedDeals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No closed deals</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>Investment Amount</TableHead>
                      <TableHead>Closing Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closedDeals.map((deal) => {
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
                            {deal.committedAmount || deal.targetRaise || 'N/A'}
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(deal.id)}>
                            {deal.closedAt ? (
                              format(new Date(deal.closedAt), 'MMM d, yyyy')
                            ) : (
                              format(new Date(deal.updatedAt), 'MMM d, yyyy')
                            )}
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(deal.id)}>
                            <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                              Closed
                            </Badge>
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
                                  setLocation(`/deals/${deal.id}?tab=documents`);
                                }}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/deals/${deal.id}?tab=performance`);
                                }}
                              >
                                <PiggyBank className="h-4 w-4" />
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
