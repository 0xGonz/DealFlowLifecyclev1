import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Deal } from "@/lib/types";

type SectorDistributionProps = {
  deals: Deal[] | undefined;
  stage: string;
};

// Predefined colors for sectors matching the dashboard
const SECTOR_COLORS = [
  '#4e87f6', // Blue
  '#f9bf4c', // Orange
  '#f4736d', // Red
  '#4cb8a8', // Teal
  '#9f7cf5', // Purple
  '#f47fa7', // Pink
  '#6dcff6', // Light Blue
  '#f7d877', // Yellow
  '#a4de6c', // Light Green
  '#83a6ed', // Periwinkle
  '#8dd1e1', // Sky Blue
  '#d6c1dd', // Lavender
];

const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent, index, name
}: any) => {
  // Only show label if segment is large enough (> 5%)
  if (percent < 0.05) return null;
  
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor="middle" 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-2 border border-neutral-200 rounded-md shadow-sm">
        <p className="font-medium">{data.name}</p>
        <p><span className="font-medium">Count:</span> {data.value} deals</p>
        <p><span className="font-medium">Percentage:</span> {(data.percent * 100).toFixed(0)}%</p>
      </div>
    );
  }
  return null;
};

export default function SectorDistribution({ deals, stage }: SectorDistributionProps) {
  if (!deals || deals.length === 0) return null;
  
  // Group by sector
  const sectorCounts: Record<string, number> = {};
  deals.forEach(deal => {
    sectorCounts[deal.sector] = (sectorCounts[deal.sector] || 0) + 1;
  });
  
  // Convert to array for chart
  const sectorData = Object.entries(sectorCounts).map(([name, value]) => ({
    name,
    value
  }));
  
  // Sort by count (descending)
  sectorData.sort((a, b) => b.value - a.value);
  
  // Limit to top 7 sectors for better visualization, combine others
  const processedData = React.useMemo(() => {
    if (sectorData.length <= 7) return sectorData;
    
    const topSectors = sectorData.slice(0, 6);
    const otherSectors = sectorData.slice(6);
    
    const otherCount = otherSectors.reduce((sum, item) => sum + item.value, 0);
    
    return [
      ...topSectors,
      {
        name: 'Other Sectors',
        value: otherCount
      }
    ];
  }, [sectorData]);
  
  const title = stage === 'all' 
    ? 'Sector Distribution' 
    : `Sector Distribution - ${stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full sm:pr-[100px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={processedData}
                cx="40%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                innerRadius={60}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {processedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="middle" 
                align="right"
                layout="vertical"
                payload={
                  processedData.map((item, index) => {
                    const totalCount = processedData.reduce((sum, i) => sum + i.value, 0);
                    const percentage = (item.value / totalCount * 100).toFixed(0);
                    return {
                      value: `${item.name} (${percentage}%)`,
                      type: 'circle',
                      id: item.name,
                      color: SECTOR_COLORS[index % SECTOR_COLORS.length],
                    };
                  })
                }
                iconSize={10}
                wrapperStyle={{ right: 0, top: 20 }}
                formatter={(value: string) => <span className="text-sm font-medium">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
