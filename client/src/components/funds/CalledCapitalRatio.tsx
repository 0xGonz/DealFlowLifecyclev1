import React from 'react';
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
  // Calculate called vs uncalled capital based on allocation status
  const capitalData = React.useMemo(() => {
    const called = allocations
      .filter(allocation => allocation.status === 'funded')
      .reduce((sum, allocation) => sum + allocation.amount, 0);
    
    const committed = allocations
      .filter(allocation => allocation.status === 'committed')
      .reduce((sum, allocation) => sum + allocation.amount, 0);
      
    // Calculate uncalled as the total committed but not funded
    const uncalled = committed;
    
    // Make sure we have at least some data to display
    if (called === 0 && uncalled === 0) {
      return [];
    }
    
    return [
      { name: "Called Capital", value: called, color: "#4f46e5" },
      { name: "Uncalled Capital", value: uncalled, color: "#a5b4fc" }
    ];
  }, [allocations]);
  
  // Calculate percentages for display
  const totalCapital = capitalData.reduce((sum, item) => sum + item.value, 0);
  const calledPercentage = totalCapital > 0 
    ? Math.round((capitalData[0]?.value || 0) / totalCapital * 100) 
    : 0;
    
  return (
    <Card>
      <CardHeader>
        <CardTitle>Called vs. Uncalled Capital</CardTitle>
      </CardHeader>
      <CardContent>
        {capitalData.length > 0 ? (
          <div className="flex flex-col xs:flex-row items-center justify-between gap-4">
            <div className="h-48 w-full max-w-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={capitalData}
                    cx="50%"
                    cy="50%"
                    startAngle={90}
                    endAngle={-270}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {capitalData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36}/>
                  <Tooltip 
                    formatter={(value: number) => [`${formatCurrency(value)}`, `Amount`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-col gap-4 grow">
              <div className="text-center xs:text-left">
                <p className="text-xs text-neutral-500 mb-1">Called Rate</p>
                <p className="text-2xl sm:text-3xl font-semibold">{calledPercentage}%</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Called</p>
                  <p className="text-lg font-medium">{formatCurrency(capitalData[0]?.value || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Uncalled</p>
                  <p className="text-lg font-medium">{formatCurrency(capitalData[1]?.value || 0)}</p>
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
