import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, Briefcase, Clock, DollarSign, PieChart } from "lucide-react";
import { Deal } from "@/lib/types";
import { formatCurrency, formatPercentage } from "@/lib/utils/format";

type PipelineStat = {
  label: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  iconColor: string;
};

type PipelineStatsProps = {
  deals: Deal[] | undefined;
  filteredDeals: Deal[] | undefined;
  stage: string;
};

export default function PipelineStats({ deals, filteredDeals, stage }: PipelineStatsProps) {
  if (!deals || !filteredDeals) return null;
  
  // Calculate statistics for the current view
  const totalDealsCount = filteredDeals.length;
  
  // Calculate the total deal value
  const totalDealValue = filteredDeals.reduce((sum, deal) => {
    const targetRaise = deal.targetRaise?.replace(/[^0-9.]/g, '');
    return sum + (targetRaise ? parseFloat(targetRaise) : 0);
  }, 0) * 1000000; // Converting to actual value if in millions
  
  // Calculate average deal score
  const avgScore = filteredDeals.reduce((sum, deal) => sum + (deal.score || 0), 0) / 
    (filteredDeals.length || 1);
  
  // Calculate stage-specific stats
  const stageDeals = stage !== 'all' ? filteredDeals : deals.filter(d => d.stage === 'diligence');
  
  // Calculate actual trends based on proportions in pipeline
  const totalTrend = deals.length > 0 ? Math.round((filteredDeals.length / deals.length) * 100) - 100 : 0;
  const stageTrend = deals.length > 0 ? Math.round((stageDeals.length / deals.length) * 100) - 100 : 0;
  const valueTrend = filteredDeals.length > 0 ? Math.round((totalDealValue / filteredDeals.length) / 1000000) : 0;
  
  // Calculate stage conversion rate (for different stages this would be calculated differently)
  const conversionRate = stage === 'all' ? 
    (deals.filter(d => d.stage === 'invested').length / (deals.length || 1)) * 100 :
    (filteredDeals.length / (deals.length || 1)) * 100;
  
  const stageLabel = stage === 'all' ? "In Diligence" : 
    stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  const stats: PipelineStat[] = [
    {
      label: "Total Deals",
      value: totalDealsCount,
      trend: totalTrend, 
      icon: <Briefcase />,
      iconColor: "bg-blue-100 text-blue-600"
    },
    {
      label: "Deal Value",
      value: formatCurrency(totalDealValue, true),
      trend: valueTrend,
      icon: <DollarSign />,
      iconColor: "bg-emerald-100 text-emerald-600"
    },
    {
      label: stageLabel,
      value: stageDeals.length,
      trend: stageTrend,
      icon: <Clock />,
      iconColor: "bg-violet-100 text-violet-600"
    },
    {
      label: "Conversion Rate",
      value: formatPercentage(conversionRate, 1),
      trend: Math.round(conversionRate) - 100,
      icon: <PieChart />,
      iconColor: "bg-amber-100 text-amber-600"
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 xs:gap-3 sm:gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-white overflow-hidden">
          <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
            <div className="flex justify-between items-center mb-2 sm:mb-3">
              <h3 className="text-xs sm:text-sm font-medium text-neutral-600 truncate mr-1">{stat.label}</h3>
              <div className={`rounded-full ${stat.iconColor} p-1.5 sm:p-2.5 flex-shrink-0`}>
                <div className="h-3.5 w-3.5 sm:h-5 sm:w-5">{stat.icon}</div>
              </div>
            </div>
            
            <div className="flex items-end flex-wrap">
              <span className="text-base sm:text-xl md:text-2xl font-bold mr-1 sm:mr-2 truncate max-w-full">
                {stat.value}
              </span>
              
              {stat.trend && (
                <div className={`flex items-center ${stat.trend > 0 ? 'text-emerald-600' : 'text-red-500'} text-[10px] sm:text-xs font-medium whitespace-nowrap`}>
                  {stat.trend > 0 ? (
                    <>
                      <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                      +{stat.trend}%
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                      {stat.trend}%
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
