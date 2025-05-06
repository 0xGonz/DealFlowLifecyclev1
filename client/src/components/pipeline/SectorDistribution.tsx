import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Deal } from "@/lib/types";
import { formatPercentage } from '@/lib/utils/format';
import { FINANCIAL_CALCULATION } from '@/lib/constants/calculation-constants';

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
      {formatPercentage(percent * 100, 0)}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-2 border border-neutral-200 rounded-md shadow-sm">
        <p className="font-medium text-black">{data.name}</p>
        <p className="text-black"><span className="font-medium text-black">Count:</span> {data.value} deals</p>
        <p className="text-black"><span className="font-medium text-black">Percentage:</span> <span className="font-bold">{formatPercentage(data.percent * 100, 0)}</span></p>
      </div>
    );
  }
  return null;
};

export default function SectorDistribution({ deals, stage }: SectorDistributionProps) {
  if (!deals || deals.length === 0) return null;
  
  // Use state to track viewport size
  const [isMobile, setIsMobile] = React.useState(false);
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);
  
  // Set up responsive breakpoints
  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsSmallScreen(window.innerWidth < 480);
    };
    
    // Check initially
    checkScreenSize();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);
    
    // Clean up event listener
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
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
    <Card className="mb-6 h-full w-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="h-[260px] xs:h-[280px] sm:h-[320px] md:h-[350px] w-full relative overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={processedData}
                cx={isMobile ? "50%" : "40%"}
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                innerRadius={isSmallScreen ? 35 : isMobile ? 45 : 60}
                outerRadius={isSmallScreen ? 70 : isMobile ? 85 : 100}
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
                verticalAlign={isMobile ? "bottom" : "middle"}
                align={isMobile ? "center" : "right"}
                layout={isMobile ? "horizontal" : "vertical"}
                payload={
                  processedData.map((item, index) => {
                    const totalCount = processedData.reduce((sum, i) => sum + i.value, 0);
                    const percentageValue = item.value / totalCount * 100;
                    // Truncate long names on small screens
                    const displayName = isMobile && item.name.length > 12 ? 
                      item.name.substring(0, 10) + '...' : item.name;
                    return {
                      value: isMobile ? 
                        `${displayName}` : 
                        `${item.name} `,
                      type: 'circle',
                      id: item.name,
                      color: SECTOR_COLORS[index % SECTOR_COLORS.length],
                    };
                  })
                }
                iconSize={isMobile ? 8 : 10}
                wrapperStyle={isMobile ? { bottom: 0, maxWidth: '100%', overflowX: 'hidden' } : { right: 0, top: 20 }}
                formatter={(value: string, entry) => {
                  const processedEntry = processedData.find(item => item.name === entry.id);
                  if (!processedEntry) return <span className="text-[10px] xs:text-xs sm:text-sm font-medium truncate text-black">{value}</span>;
                  
                  const totalCount = processedData.reduce((sum, i) => sum + i.value, 0);
                  const percentageValue = processedEntry.value / totalCount * 100;
                  
                  // Show only the percentage in xx.xx% format
                  return (
                    <span className="text-[10px] xs:text-xs sm:text-sm font-medium truncate text-black">
                      {formatPercentage(percentageValue, 2)}
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
