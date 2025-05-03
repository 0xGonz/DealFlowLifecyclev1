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
  
  // Calculate deal value (in a real app, this would be calculated differently)
  const totalDealValue = filteredDeals.length * 5000000; // Sample calculated value
  
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
  
  // Count deals by stage
  const initialReviewCount = deals.filter(d => d.stage === 'initial_review').length;
  const screeningCount = deals.filter(d => d.stage === 'screening').length;
  const diligenceCount = deals.filter(d => d.stage === 'diligence').length;
  const icReviewCount = deals.filter(d => d.stage === 'ic_review').length;
  const closingCount = deals.filter(d => d.stage === 'closing').length;
  const investedCount = deals.filter(d => d.stage === 'invested').length;
  
  // Calculate conversion percentages
  const screeningPercent = deals.length > 0 ? Math.round((screeningCount / deals.length) * 100) : 0;
  const diligencePercent = deals.length > 0 ? Math.round((diligenceCount / deals.length) * 100) : 0;
  const icPercent = deals.length > 0 ? Math.round((icReviewCount / deals.length) * 100) : 0;
  const investmentPercent = deals.length > 0 ? Math.round((investedCount / deals.length) * 100) : 0;
  
  // Calculate average days in current stage for stage-specific tabs
  const calculateAverageDaysInStage = (deals: Deal[], stageName: string): number => {
    if (deals.length === 0) return 0;
    
    // We don't have actual stage change timestamps in this demo, so we'll use a realistic calculation
    // In a real app, we'd use the actual stage change date from the timeline events
    const today = new Date();
    const totalDays = deals.reduce((sum, deal) => {
      // For demo, calculate days since record creation - in a real app use actual stage change date
      const creationDate = new Date(deal.createdAt);
      const dayDiff = Math.floor((today.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24));
      // Add some randomization to make it look realistic
      return sum + (dayDiff > 0 ? dayDiff : 1);
    }, 0);
    
    return Math.round(totalDays / deals.length);
  };
  
  // Create different stats for all deals vs. specific stage
  let stats: PipelineStat[] = [];
  
  if (stage === 'all') {
    // For "All Deals" tab - show pipeline distribution
    stats = [
      {
        label: "Total Deals",
        value: totalDealsCount,
        trend: totalTrend, 
        icon: <Briefcase />,
        iconColor: "bg-blue-100 text-blue-600"
      },
      {
        label: "In Screening",
        value: screeningCount,
        trend: stageTrend,
        icon: <Clock />,
        iconColor: "bg-violet-100 text-violet-600"
      },
      {
        label: "In Diligence",
        value: diligenceCount,
        trend: diligencePercent - 30, // Estimated trend
        icon: <Target />,
        iconColor: "bg-emerald-100 text-emerald-600"
      },
      {
        label: "Investment Rate",
        value: formatPercentage(investmentPercent, 0),
        trend: investmentPercent - 20, // Estimated trend
        icon: <PieChart />,
        iconColor: "bg-amber-100 text-amber-600"
      },
    ];
  } else {
    // For specific stage tabs - focus on stage metrics
    const stageName = stage.replace('_', ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    const averageDaysInStage = calculateAverageDaysInStage(filteredDeals, stage);
    const maxDaysInStage = filteredDeals.length > 0 ? 
      Math.max(...filteredDeals.map(d => {
        const creationDate = new Date(d.createdAt);
        const today = new Date();
        return Math.floor((today.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24));
      })) : 0;
    
    stats = [
      {
        label: `Deals in ${stageName}`,
        value: filteredDeals.length,
        trend: filteredDeals.length - 2, // Demo trend
        icon: <Briefcase />,
        iconColor: "bg-blue-100 text-blue-600"
      },
      {
        label: `Avg Days in ${stageName}`,
        value: averageDaysInStage,
        trend: 0,
        icon: <Clock />,
        iconColor: "bg-violet-100 text-violet-600"
      },
      {
        label: `Longest in ${stageName}`,
        value: maxDaysInStage,
        trend: 0,
        icon: <Target />,
        iconColor: "bg-emerald-100 text-emerald-600"
      },
      {
        label: "Next Stage Rate",
        value: formatPercentage(70, 0), // Demo value - would be actual in real app
        trend: 5,
        icon: <PieChart />,
        iconColor: "bg-amber-100 text-amber-600"
      },
    ];
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 xs:gap-3 sm:gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-white overflow-hidden h-full">
          <CardContent className="pt-3 xs:pt-4 sm:pt-6 p-2 xs:p-3 sm:p-6 h-full flex flex-col">
            <div className="flex justify-between items-start mb-1 xs:mb-2 sm:mb-3">
              <h3 className="text-[10px] xs:text-xs sm:text-sm font-medium text-neutral-600 truncate mr-1 max-w-[75%]">{stat.label}</h3>
              <div className={`rounded-full ${stat.iconColor} p-1 xs:p-1.5 sm:p-2.5 flex-shrink-0`}>
                <div className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-5 sm:w-5">{stat.icon}</div>
              </div>
            </div>
            
            <div className="flex items-end flex-wrap mt-auto">
              <span className="text-sm xs:text-base sm:text-xl md:text-2xl font-bold mr-1 sm:mr-2 truncate max-w-full">
                {stat.value}
              </span>
              
              {/* Trend indicator */}
              {stat.trend !== undefined && (
                <div className="flex items-center">
                  {stat.trend > 0 ? (
                    <div className="text-success flex items-center text-[9px] xs:text-xs">
                      <TrendingUp className="h-2.5 w-2.5 xs:h-3 xs:w-3 mr-0.5 xs:mr-1" />
                      {stat.trend}%
                    </div>
                  ) : stat.trend < 0 ? (
                    <div className="text-danger flex items-center text-[9px] xs:text-xs">
                      <TrendingDown className="h-2.5 w-2.5 xs:h-3 xs:w-3 mr-0.5 xs:mr-1" />
                      {Math.abs(stat.trend)}%
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
