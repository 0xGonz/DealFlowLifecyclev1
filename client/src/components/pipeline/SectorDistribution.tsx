import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Deal } from "@/lib/types";

type SectorDistributionProps = {
  deals: Deal[] | undefined;
  stage: string;
};

export default function SectorDistribution({ deals, stage }: SectorDistributionProps) {
  if (!deals || deals.length === 0) return null;
  
  // Group by sector
  const sectorCounts: Record<string, number> = {};
  deals.forEach(deal => {
    sectorCounts[deal.sector] = (sectorCounts[deal.sector] || 0) + 1;
  });
  
  // Convert to array for chart
  const sectorData = Object.entries(sectorCounts).map(([name, value], index) => ({
    name,
    value,
    color: getColorForIndex(index)
  }));
  
  // Sort by count (descending)
  sectorData.sort((a, b) => b.value - a.value);
  
  const title = stage === 'all' 
    ? 'Sector Distribution' 
    : `Sector Distribution - ${stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
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
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {sectorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} deals`, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper to get colors for pie chart segments
function getColorForIndex(index: number): string {
  const colors = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
    '#82CA9D', '#A4DE6C', '#D0ED57', '#FFC658', '#FF6B6B'
  ];
  
  return colors[index % colors.length];
}
