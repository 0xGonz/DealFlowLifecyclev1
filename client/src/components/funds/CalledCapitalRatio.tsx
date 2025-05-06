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
    
    // For single payment allocations in 'committed' status, we need to show them as fully called
    // This is a temporary fix until we update the backend to use 'funded' status
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
  const isMediumScreen = windowWidth >= 640 && windowWidth < 768;
  const isLargeScreen = windowWidth >= 768;

  // Dynamic sizing for the chart
  const chartLayout = isSmallScreen ? 'vertical' : 'horizontal';
  const chartWidth = isSmallScreen ? '100%' : isMediumScreen ? '45%' : '40%';
  const chartHeight = isSmallScreen ? '250px' : isMediumScreen ? '100%' : '100%';

  // Dynamic inner and outer radius based on container size
  const innerRadius = isSmallScreen ? 55 : isMediumScreen ? 60 : 65;
  const outerRadius = isSmallScreen ? 85 : isMediumScreen ? 90 : 100;
    
  return (
    <Card className="h-full w-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle>Called vs. Uncalled Capital</CardTitle>
        <p className="text-sm text-muted-foreground">Based on funded allocation status</p>
      </CardHeader>
      <CardContent className="grow flex-1 flex flex-col">
        {capitalData.length > 0 ? (
          <div className={`flex flex-col ${isSmallScreen ? 'items-center' : 'sm:flex-row sm:items-stretch'} justify-between gap-4 h-full`}>
            <div className={`${isSmallScreen ? 'w-full max-w-xs' : 'w-full sm:w-auto flex-1'} ${chartHeight}`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={capitalData}
                    cx="50%"
                    cy="50%"
                    startAngle={90}
                    endAngle={-270}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {capitalData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend 
                    verticalAlign={isSmallScreen ? "bottom" : "middle"}
                    align={isSmallScreen ? "center" : "right"}
                    layout={isSmallScreen ? "horizontal" : "vertical"}
                    iconSize={10}
                    formatter={(value: string) => {
                      const item = capitalData.find(item => item.name === value);
                      if (!item) return <span>{value}</span>;
                      
                      const percentage = item.value / totalCapital * 100;
                      return (
                        <span className="text-xs sm:text-sm font-medium">
                          {value} ({Math.round(percentage)}%)
                        </span>
                      );
                    }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${formatCurrency(value)}`, `Capital Amount`]}
                    labelFormatter={(label: string) => `${label} (${label === 'Called Capital' ? 'Funded' : 'Committed but not Funded'})`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className={`flex flex-col justify-center gap-3 sm:gap-4 ${isSmallScreen ? 'w-full' : 'sm:w-1/2 md:w-2/5'}`}>
              <div className="text-center sm:text-left">
                <p className="text-xs text-neutral-500 mb-0.5 sm:mb-1">Called Rate</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-semibold">{calledPercentage}%</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5 sm:mb-1">Called (Funded)</p>
                  <p className="text-sm sm:text-base md:text-lg font-medium truncate">{formatCurrency(capitalData[0]?.value || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5 sm:mb-1">Uncalled (Committed)</p>
                  <p className="text-sm sm:text-base md:text-lg font-medium truncate">{formatCurrency(capitalData[1]?.value || 0)}</p>
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
