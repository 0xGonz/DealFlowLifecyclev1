import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Deal } from "@/lib/types";
import { DealStageLabels, DealStageColors } from "@shared/schema";

type StageDistributionProps = {
  deals: Deal[] | undefined;
  stage: string;
};

// Tailwind color classes for stages, matching the application's design language
const STAGE_COLORS: Record<string, string> = {
  initial_review: "bg-neutral-400", // Grey
  screening: "bg-sky-400",          // Sky blue
  diligence: "bg-blue-500",         // Blue
  ic_review: "bg-violet-500",       // Violet
  closing: "bg-amber-500",          // Amber
  closed: "bg-green-500",           // Green
  invested: "bg-emerald-500",       // Emerald
  rejected: "bg-red-500"            // Red
};

export default function StageDistribution({ deals, stage }: StageDistributionProps) {
  if (!deals || deals.length === 0) return null;
  
  // Group deals by stage
  const stageGroups = deals.reduce((acc: Record<string, Deal[]>, deal: Deal) => {
    const stage = deal.stage;
    if (!acc[stage]) {
      acc[stage] = [];
    }
    acc[stage].push(deal);
    return acc;
  }, {});
  
  // Calculate stats for each stage
  const stageStats = Object.entries(stageGroups).map(([stageName, stageDeals]) => ({
    stage: stageName,
    label: DealStageLabels[stageName as keyof typeof DealStageLabels] || stageName,
    count: stageDeals.length,
    percentage: Math.round((stageDeals.length / deals.length) * 100),
    colorClass: STAGE_COLORS[stageName] || "bg-neutral-400"
  }));
  
  // Sort by count (descending)
  stageStats.sort((a, b) => b.count - a.count);
  
  const title = stage === 'all' 
    ? 'Deal Stage Distribution' 
    : `Stage Distribution - ${stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stageStats.map((stat) => (
            <div key={stat.stage} className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${stat.colorClass} mr-2`}></div>
                  <span className="text-sm font-medium">{stat.label}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-neutral-500 mr-2">{stat.count} deals</span>
                  <span className="text-xs text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-full">
                    {stat.percentage}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-2.5">
                <div 
                  className={`${stat.colorClass} h-2.5 rounded-full transition-all duration-300 ease-in-out`} 
                  style={{ width: `${stat.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
