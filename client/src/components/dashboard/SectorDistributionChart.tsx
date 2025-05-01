import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SectorStatItem {
  sector: string;
  count: number;
  percentage: number;
}

// Predefined colors for sectors matching the reference design
const SECTOR_COLORS = [
  '#4e87f6', // Blue (Real Estate)
  '#f9bf4c', // Orange (Venture)
  '#f4736d', // Red (Private Credit)
  '#4cb8a8', // Teal (Buyout)
  '#9f7cf5', // Purple (Energy)
  '#f47fa7', // Pink (GP Stakes)
  '#6dcff6', // Light Blue (Crypto)
  '#f7d877', // Yellow (Other)
  '#a4de6c', // Light Green
  '#83a6ed', // Light Blue
  '#8dd1e1', // Sky Blue
  '#d6c1dd', // Lavender
];

const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload
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
      {`${payload.sector} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

const CustomTooltip = ({ active, payload, sectorData }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const totalCount = sectorData.reduce((sum: number, item: any) => sum + item.count, 0);
    const percentage = (data.count / totalCount * 100).toFixed(0);
    
    return (
      <div className="bg-white p-2 border border-neutral-200 rounded-md shadow-sm">
        <p className="font-medium">{data.sector}</p>
        <p><span className="font-medium">Count:</span> {data.count}</p>
        <p><span className="font-medium">Percentage:</span> {percentage}%</p>
      </div>
    );
  }
  return null;
};

export default function SectorDistributionChart() {
  const { data: sectorStats = [], isLoading } = useQuery<SectorStatItem[]>({
    queryKey: ['/api/dashboard/sector-stats'],
  });

  // Limit to top 8 sectors for better visualization, combine others
  const processedData = React.useMemo(() => {
    if (sectorStats.length <= 8) return sectorStats;
    
    const topSectors = sectorStats.slice(0, 7);
    const otherSectors = sectorStats.slice(7);
    
    const otherCount = otherSectors.reduce((sum, item) => sum + item.count, 0);
    const otherPercentage = otherSectors.reduce((sum, item) => sum + item.percentage, 0);
    
    return [
      ...topSectors,
      {
        sector: 'Other Sectors',
        count: otherCount,
        percentage: otherPercentage
      }
    ];
  }, [sectorStats]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Sector Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : processedData.length === 0 ? (
          <div className="flex justify-center items-center h-[300px]">
            <p className="text-neutral-500">No sector data available</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={processedData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {processedData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip sectorData={processedData} />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  formatter={(value, entry, index) => {
                    const totalCount = processedData.reduce((sum, item) => sum + item.count, 0);
                    const item = processedData[index];
                    const percentage = (item.count / totalCount * 100).toFixed(0);
                    return `${value} (${percentage}%)`;
                  }}
                  iconType="circle"
                  layout="horizontal"
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