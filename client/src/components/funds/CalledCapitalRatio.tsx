import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Badge } from "@/components/ui/badge";

interface CalledCapitalRatioProps {
  allocations: any[];
  totalFundSize: number;
}

export default function CalledCapitalRatio({ allocations = [], totalFundSize = 0 }: CalledCapitalRatioProps) {
  // Calculate called and uncalled capital
  const { calledCapital, uncalledCapital, calledRatio, uncalledRatio } = useMemo(() => {
    // Total committed or funded capital is considered "called"
    const called = allocations
      .filter(a => a.status === 'funded' || a.status === 'committed')
      .reduce((sum, allocation) => sum + allocation.amount, 0);
    
    // Calculate uncalled amount (remaining capital)
    const uncalled = Math.max(0, totalFundSize - called);
    
    // Calculate percentages
    const calledPercent = totalFundSize > 0 ? Math.round((called / totalFundSize) * 100) : 0;
    const uncalledPercent = 100 - calledPercent;
    
    return {
      calledCapital: called,
      uncalledCapital: uncalled,
      calledRatio: calledPercent,
      uncalledRatio: uncalledPercent
    };
  }, [allocations, totalFundSize]);
  
  // Prepare chart data
  const chartData = [
    { name: 'Called Capital', value: calledRatio, fill: '#0088FE' },
    { name: 'Uncalled Capital', value: uncalledRatio, fill: '#EBEDF0' },
  ];
  
  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium">Called vs. Uncalled Capital</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    dataKey="value"
                    label={({ value }) => `${value}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value}%`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="flex flex-col justify-center space-y-4">
            <div>
              <div className="flex items-center mb-1">
                <span className="h-3 w-3 rounded-full bg-[#0088FE] mr-2"></span>
                <span className="text-sm font-medium">Called Capital</span>
                <Badge variant="outline" className="ml-2 font-normal">{calledRatio}%</Badge>
              </div>
              <p className="text-xl font-semibold ml-5">{formatCurrency(calledCapital)}</p>
            </div>
            
            <div>
              <div className="flex items-center mb-1">
                <span className="h-3 w-3 rounded-full bg-[#EBEDF0] mr-2"></span>
                <span className="text-sm font-medium">Uncalled Capital</span>
                <Badge variant="outline" className="ml-2 font-normal">{uncalledRatio}%</Badge>
              </div>
              <p className="text-xl font-semibold ml-5">{formatCurrency(uncalledCapital)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
