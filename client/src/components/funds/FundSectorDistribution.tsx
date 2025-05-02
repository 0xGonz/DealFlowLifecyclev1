import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { FundAllocation, Deal } from "@shared/schema";

type SectorData = {
  name: string;
  value: number;
  color: string;
};

const SECTOR_COLORS = {
  "Private Credit": "#8884d8",
  "Buyout": "#83a6ed",
  "Crypto": "#8dd1e1",
  "GP Stakes": "#82ca9d",
  "Energy": "#a4de6c",
  "Venture": "#d0ed57",
  "Technology": "#ffc658",
  "SaaS": "#ff8042",
  "Fintech": "#ff6361",
  "Healthcare": "#bc5090",
  "Other": "#b3b3b3"
};

// Get a color from our map or return a default
const getSectorColor = (sector: string): string => {
  return SECTOR_COLORS[sector as keyof typeof SECTOR_COLORS] || "#b3b3b3";
};

interface FundSectorDistributionProps {
  allocations: FundAllocation[];
  deals: Deal[];
}

const FundSectorDistribution: React.FC<FundSectorDistributionProps> = ({ 
  allocations,
  deals
 }) => {
  // Group allocations by sector
  const sectorData = React.useMemo(() => {
    const sectorTotals = new Map<string, number>();
    
    allocations.forEach(allocation => {
      // Use the allocation's security type (sector)
      const sector = allocation.securityType || "Other";
      const currentTotal = sectorTotals.get(sector) || 0;
      sectorTotals.set(sector, currentTotal + allocation.amount);
    });
    
    // Convert to the format needed for the pie chart
    return Array.from(sectorTotals.entries()).map(([name, value]) => ({
      name,
      value,
      color: getSectorColor(name)
    }));
  }, [allocations]);
  
  // Calculate the total fund size from the allocations
  const totalFundSize = sectorData.reduce((total, item) => total + item.value, 0);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sector Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {sectorData.length > 0 ? (
          <div className="flex flex-col items-center">
            <div className="h-56 w-full max-w-md">
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
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
                    labelFormatter={(label: string) => `Sector: ${label}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs sm:text-sm text-center text-neutral-500 mt-2">
              Based on ${totalFundSize.toLocaleString()} in investments
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
