import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { FundAllocation, Deal } from "@shared/schema";
import { getSectorColor } from "@/lib/constants/chart-constants";

type SectorData = {
  name: string;
  value: number;
  color: string;
};

interface FundSectorDistributionProps {
  allocations: FundAllocation[];
  deals: Deal[];
}

const FundSectorDistribution: React.FC<FundSectorDistributionProps> = ({ 
  allocations,
  deals
 }) => {
  // Group allocations by sector using portfolio weights for funded allocations
  const sectorData = React.useMemo(() => {
    // Filter to include only funded allocations with weights
    const fundedAllocations = allocations.filter(allocation => allocation.status === 'funded');
    
    // If no funded allocations, show nothing
    if (fundedAllocations.length === 0) {
      return [];
    }
    
    // Group by sector and sum weights
    const sectorTotals = new Map<string, number>();
    
    fundedAllocations.forEach(allocation => {
      // Use the allocation's security type (sector)
      const sector = allocation.securityType || "Other";
      const currentTotal = sectorTotals.get(sector) || 0;
      
      // Use portfolio weight if available, otherwise calculate from amount
      let weight = allocation.portfolioWeight || 0;
      
      // Fallback calculation if weight is 0 or not set
      if (weight === 0) {
        const totalAmount = fundedAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
        if (totalAmount > 0) {
          weight = (allocation.amount / totalAmount) * 100;
        }
      }
      
      sectorTotals.set(sector, currentTotal + weight);
    });
    
    // Convert to the format needed for the pie chart
    return Array.from(sectorTotals.entries()).map(([name, value]) => ({
      name,
      value,
      color: getSectorColor(name)
    }));
  }, [allocations]);
  
  // Calculate total weight (should be close to 100%)
  const totalWeight = sectorData.reduce((total, item) => total + item.value, 0);
  
  // Get the total called capital (funded allocations) for display
  const totalCalledCapital = React.useMemo(() => {
    return allocations
      .filter(allocation => allocation.status === 'funded')
      .reduce((sum, allocation) => sum + allocation.amount, 0);
  }, [allocations]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sector Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {sectorData.length > 0 ? (
          <div className="flex flex-col items-center">
            <div className="h-48 sm:h-52 md:h-56 w-full max-w-[280px] sm:max-w-md mx-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => {
                      // Truncate long sector names on small screens
                      const displayName = window.innerWidth < 640 && name.length > 10 
                        ? `${name.substring(0, 9)}...` 
                        : name;
                      return `${displayName} ${(percent * 100).toFixed(0)}%`;
                    }}
                  >
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Portfolio Weight']}
                    labelFormatter={(label: string) => `Sector: ${label}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs sm:text-sm text-center text-neutral-500 mt-2 px-2 sm:px-4">
              <span className="whitespace-nowrap">Based on</span> <span className="font-medium whitespace-nowrap">${totalCalledCapital.toLocaleString()}</span> <span className="whitespace-nowrap">in called capital</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-neutral-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-neutral-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            <p>No allocation data available to display sector distribution.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FundSectorDistribution;
