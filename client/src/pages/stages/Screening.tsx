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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ScreeningPage() {
  const [, setLocation] = useLocation();
  
  // Fetch all deals
  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });
  
  // Filter deals to only show Screening stage
  const screeningDeals = useMemo(() => {
    return deals.filter(deal => deal.stage === "screening");
  }, [deals]);
  
  // Calculate metrics for the stage
  const metrics = useMemo(() => {
    // Count deals
    const totalDeals = screeningDeals.length;
    
    // Group by sector
    const sectorCounts = screeningDeals.reduce((acc, deal) => {
      acc[deal.sector] = (acc[deal.sector] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Convert to chart data
    const sectorData = Object.entries(sectorCounts).map(([name, value]) => ({ name, value }));
    
    // Calculate average age in days
    const now = new Date();
    const totalAgeInDays = screeningDeals.reduce((sum, deal) => {
      const createdAt = new Date(deal.createdAt);
      const ageInDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return sum + ageInDays;
    }, 0);
    
    const averageAgeInDays = totalDeals > 0 ? Math.round(totalAgeInDays / totalDeals) : 0;
    
    // Group by round
    const roundCounts = screeningDeals.reduce((acc, deal) => {
      acc[deal.round] = (acc[deal.round] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Convert to chart data
    const roundData = Object.entries(roundCounts).map(([name, count]) => ({ name, count }));
    
    return {
      totalDeals,
      sectorData,
      roundData,
      averageAgeInDays
    };
  }, [screeningDeals]);
  
  // Handle row click to navigate to deal detail
  const handleRowClick = (dealId: number) => {
    setLocation(`/deals/${dealId}`);
  };
  
  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Screening</h1>
          <Button onClick={() => setLocation("/pipeline")}>
            View All Pipeline
          </Button>
        </div>
        
        {/* Stage Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total in Screening</CardTitle>
              <CardDescription>Current number of deals in screening</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.totalDeals}</p>
              <p className="text-sm text-muted-foreground mt-1">Average age: {metrics.averageAgeInDays} days</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Round Distribution</CardTitle>
              <CardDescription>Deals by financing round</CardDescription>
            </CardHeader>
            <CardContent className="h-[200px]">
              {metrics.roundData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    width={500}
                    height={300}
                    data={metrics.roundData}
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
                    <Bar dataKey="count" fill="#146C3C" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground h-full flex items-center justify-center">
                  No round data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Deals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Deals in Screening</CardTitle>
            <CardDescription>
              These deals are being screened against investment criteria and undergoing initial assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : screeningDeals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No deals in screening</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>Round</TableHead>
                      <TableHead>Target Raise</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {screeningDeals.map((deal) => {
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
                            {deal.targetRaise || 'N/A'}
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(deal.id)}>
                            {formatDistanceToNow(new Date(deal.createdAt), { addSuffix: true })}
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
