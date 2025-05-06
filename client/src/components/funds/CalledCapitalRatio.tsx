import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { FundAllocation } from "@shared/schema";
import { formatCurrency } from "@/lib/utils/format";

type CapitalData = {
  name: string;
  value: number;
  color: string;
};

interface CalledCapitalRatioProps {
  allocations: FundAllocation[];
  totalFundSize: number;
}

const CalledCapitalRatio: React.FC<CalledCapitalRatioProps> = ({ 
  allocations,
  totalFundSize
}) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate called vs uncalled capital based on allocation status
  const capitalData = React.useMemo(() => {
    // All 'funded' allocations are counted as called capital
    const calledAmount = allocations
      .filter(allocation => allocation.status === 'funded')
      .reduce((sum, allocation) => sum + allocation.amount, 0);
    
    // Get all committed allocations (excluding funded ones)
    const committedAmount = allocations
      .filter(allocation => allocation.status === 'committed')
      .reduce((sum, allocation) => sum + allocation.amount, 0);
      
    // Calculate uncalled as the total committed but not funded
    const uncalledAmount = committedAmount;
    
    // In case there are no allocations yet
    if (calledAmount === 0 && uncalledAmount === 0) {
      return [];
    }
    
    return [
      { name: "Called Capital", value: calledAmount, color: "#4f46e5" },
      { name: "Uncalled Capital", value: uncalledAmount, color: "#a5b4fc" }
    ];
  }, [allocations]);
  
  // Calculate percentages for display
  const totalCapital = capitalData.reduce((sum, item) => sum + item.value, 0);
  const calledPercentage = totalCapital > 0 
    ? Math.round((capitalData[0]?.value || 0) / totalCapital * 100) 
    : 0;

  // Calculate dynamic sizes based on viewport
  const isSmallScreen = windowWidth < 640;
  const isMediumScreen = windowWidth >= 640 && windowWidth < 1024;
  const isLargeScreen = windowWidth >= 1024;

  // Dynamic radius sizing based on container size
  const innerRadius = isSmallScreen ? 45 : isMediumScreen ? 50 : 55;
  const outerRadius = isSmallScreen ? 70 : isMediumScreen ? 80 : 85;
    
  return (
    <Card className="h-full w-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Called vs. Uncalled Capital</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center py-0">
        {capitalData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Chart Section */}
            <div className="flex flex-col items-center justify-center h-full min-h-[230px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={230}>
                <PieChart>
                  <Pie
                    data={capitalData}
                    cx="50%"
                    cy="50%"
                    startAngle={90}
                    endAngle={-270}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${Math.round(percent * 100)}%`}
                    labelLine={false}
                  >
                    {capitalData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke={entry.color}
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${formatCurrency(value)}`, `Amount`]}
                    labelFormatter={(label: string) => label}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Stats Section */}
            <div className="flex flex-col justify-center space-y-5">
              {/* Called Rate */}
              <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
                <p className="text-sm text-neutral-500">Called Rate</p>
                <div className="flex items-baseline mt-1">
                  <span className="text-3xl font-bold">{calledPercentage}%</span>
                  <span className="ml-2 text-sm text-neutral-500">of total capital</span>
                </div>
              </div>
              
              {/* Capital Breakdown */}
              <div className="space-y-3">
                {/* Called Capital */}
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-indigo-600 mr-3"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Called Capital</p>
                    <p className="text-lg font-semibold">{formatCurrency(capitalData[0]?.value || 0)}</p>
                  </div>
                </div>
                
                {/* Uncalled Capital */}
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-indigo-300 mr-3"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Uncalled Capital</p>
                    <p className="text-lg font-semibold">{formatCurrency(capitalData[1]?.value || 0)}</p>
                  </div>
                </div>
                
                {/* Total Capital */}
                <div className="flex items-center pt-2 border-t border-gray-200">
                  <div className="w-4 h-4 rounded-full bg-gray-200 mr-3"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Total Capital</p>
                    <p className="text-lg font-semibold">{formatCurrency(totalCapital)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-neutral-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-neutral-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No allocation data available to calculate capital ratios.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CalledCapitalRatio;
