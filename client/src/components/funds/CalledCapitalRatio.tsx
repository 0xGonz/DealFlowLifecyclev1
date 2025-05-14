import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, CartesianGrid, Tooltip, LabelList } from 'recharts';
import { FundAllocation } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/format";

type CapitalData = {
  name: string;
  value: number;
  color: string;
  percentage?: number;
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
  const capitalData = React.useMemo((): CapitalData[] => {
    // Handle null or undefined allocations to avoid runtime errors
    if (!allocations || allocations.length === 0) {
      return [];
    }
    
    // All 'funded' allocations are counted as called capital
    const calledAmount = allocations
      .filter(allocation => allocation && allocation.status === 'funded')
      .reduce((sum, allocation) => sum + (allocation.amount || 0), 0);
    
    // Get all committed allocations (excluding funded ones)
    const committedAmount = allocations
      .filter(allocation => allocation && allocation.status === 'committed')
      .reduce((sum, allocation) => sum + (allocation.amount || 0), 0);
      
    // Calculate uncalled as the total committed but not funded
    const uncalledAmount = committedAmount;
    
    // In case there are no allocations yet
    if (calledAmount === 0 && uncalledAmount === 0) {
      return [];
    }
    
    const totalAmount = calledAmount + uncalledAmount;
    
    return [
      { 
        name: "Called Capital", 
        value: calledAmount, 
        color: "#4f46e5",
        percentage: Math.round((calledAmount / totalAmount) * 100)
      },
      { 
        name: "Uncalled Capital", 
        value: uncalledAmount, 
        color: "#a5b4fc",
        percentage: Math.round((uncalledAmount / totalAmount) * 100)
      }
    ];
  }, [allocations]);
  
  // Calculate percentages for display
  const totalCapital = capitalData && capitalData.length > 0 ?
    capitalData.reduce((sum, item) => sum + (item.value || 0), 0) : 0;
    
  const calledPercentage = totalCapital > 0 
    ? Math.round((capitalData[0]?.value || 0) / totalCapital * 100) 
    : 0;

  // Calculate dynamic sizes based on viewport
  const isSmallScreen = windowWidth < 640;
  const isMediumScreen = windowWidth >= 640 && windowWidth < 1024;
  
  return (
    <Card className="h-full w-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Called vs. Uncalled Capital</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center py-0">
        {capitalData && capitalData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Chart Section */}
            <div className="flex flex-col items-center justify-center h-full min-h-[230px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={230}>
                <BarChart
                  data={[{ 
                    name: "Capital", 
                    called: capitalData[0]?.value || 0, 
                    uncalled: capitalData[1]?.value || 0,
                    total: totalCapital
                  }]}
                  margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
                  stackOffset="expand"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} />
                  <XAxis 
                    type="category"
                    dataKey="name"
                    hide={true}
                  />
                  <YAxis 
                    type="number"
                    domain={[0, 1]}
                    tickFormatter={(value) => `${Math.round(value * 100)}%`}
                    ticks={[0, 0.25, 0.5, 0.75, 1]}
                  />
                  <Tooltip 
                    formatter={(value: number, name) => {
                      if (name === "called") return [`${formatCurrency(value)} (${Math.round((value/totalCapital)*100)}%)`, "Called Capital"];
                      return [`${formatCurrency(value)} (${Math.round((value/totalCapital)*100)}%)`, "Uncalled Capital"];
                    }}
                    labelFormatter={() => "Capital Distribution"}
                  />
                  <Bar 
                    dataKey="called" 
                    stackId="a"
                    barSize={80}
                    fill="#4f46e5"
                    name="Called Capital"
                  >
                    <LabelList 
                      position="center"
                      formatter={() => capitalData[0]?.percentage ? `${capitalData[0].percentage}%` : ""}
                      style={{ fill: '#fff', fontWeight: 'bold' }}
                    />
                  </Bar>
                  <Bar 
                    dataKey="uncalled" 
                    stackId="a"
                    barSize={80}
                    fill="#a5b4fc"
                    name="Uncalled Capital"
                  >
                    <LabelList 
                      position="center"
                      formatter={() => capitalData[1]?.percentage ? `${capitalData[1].percentage}%` : ""}
                      style={{ fill: '#000', fontWeight: 'bold' }}
                    />
                  </Bar>
                </BarChart>
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
