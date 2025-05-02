import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface FundSectorDistributionProps {
  allocations: any[];
  deals: any[];
}

export default function FundSectorDistribution({ allocations = [], deals = [] }: FundSectorDistributionProps) {
  
  // Generate sector distribution data from fund allocations
  const sectorData = useMemo(() => {
    if (!allocations.length || !deals.length) return [];
    
    // Group allocations by sector
    const sectorMap = new Map<string, number>();
    
    allocations.forEach(allocation => {
      const deal = deals.find(d => d.id === allocation.dealId);
      if (!deal) return;
      
      const sector = deal.sector || allocation.securityType;
      const currentAmount = sectorMap.get(sector) || 0;
      sectorMap.set(sector, currentAmount + allocation.amount);
    });
    
    // Convert map to array and calculate percentages
    const total = Array.from(sectorMap.values()).reduce((sum, amount) => sum + amount, 0);
    const result = Array.from(sectorMap.entries()).map(([sector, amount]) => ({
      name: sector,
      value: Math.round((amount / total) * 100)
    }));
    
    // Sort by value descending
    return result.sort((a, b) => b.value - a.value);
  }, [allocations, deals]);
  
  // Colors for the chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium">Sector Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {sectorData.length === 0 ? (
          <div className="flex justify-center items-center py-6 text-neutral-500 text-sm">
            No allocation data available
          </div>
        ) : (
          <div className="h-[230px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value}%`, 'Allocation']}
                />
                <Legend 
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
