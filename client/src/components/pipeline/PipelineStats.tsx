import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, Briefcase, Clock } from "lucide-react";
import { Deal } from "@/lib/types";
import { formatCurrency, formatPercentage } from "@/lib/utils/format";

type PipelineStat = {
  label: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
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
  const stageTrend = 5; // Mock trend - in reality would calculate based on historical data
  
  // Calculate stage conversion rate (for different stages this would be calculated differently)
  const conversionRate = stage === 'all' ? 
    (deals.filter(d => d.stage === 'invested').length / (deals.length || 1)) * 100 :
    (filteredDeals.length / (deals.length || 1)) * 100;
  
  const stats: PipelineStat[] = [
    {
      label: "Total Deals",
      value: totalDealsCount,
      trend: 12, // Would calculate from historical data
      icon: <Briefcase className="h-5 w-5 text-primary"/>
    },
    {
      label: "Deal Value",
      value: formatCurrency(totalDealValue, true),
      trend: 8,
      icon: <TrendingUp className="h-5 w-5 text-success"/>
    },
    {
      label: stage === 'all' ? "In Diligence" : stage.replace('_', ' '),
      value: stageDeals.length,
      trend: stageTrend,
      icon: <Clock className="h-5 w-5 text-accent"/>
    },
    {
      label: "Conversion Rate",
      value: formatPercentage(conversionRate, 1),
      trend: -2,
      icon: <Target className="h-5 w-5 text-warning"/>
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-white">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-neutral-600">{stat.label}</h3>
              <div className="rounded-full bg-primary-50 p-2">
                {stat.icon}
              </div>
            </div>
            
            <div className="flex items-end">
              <span className="text-xl sm:text-2xl font-bold mr-2">
                {stat.value}
              </span>
              
              {stat.trend && (
                <div className={`flex items-center ${stat.trend > 0 ? 'text-success' : 'text-destructive'} text-xs`}>
                  {stat.trend > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{stat.trend}%
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 mr-1" />
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
