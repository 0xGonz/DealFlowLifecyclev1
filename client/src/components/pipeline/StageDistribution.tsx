import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Deal } from "@/lib/types";
import { DealStageLabels, DealStageColors } from "@shared/schema";

type StageDistributionProps = {
  deals: Deal[] | undefined;
  stage: string;
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
  
  // Calculate percentages for each stage
  const stageStats = Object.entries(stageGroups).map(([stageName, stageDeals]) => ({
    stage: stageName,
    label: DealStageLabels[stageName as keyof typeof DealStageLabels] || stageName,
    count: stageDeals.length,
    percentage: Math.round((stageDeals.length / deals.length) * 100),
    colorClass: getStageBgClass(stageName)
  }));
  
  // Sort by count (descending)
  stageStats.sort((a, b) => b.count - a.count);
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">
          Deal Stage Distribution
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
                <span className="text-sm text-neutral-500">{stat.count} deals</span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-2.5">
                <div 
                  className={`${stat.colorClass} h-2.5 rounded-full`} 
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

// Helper function to get Tailwind color classes for stages
function getStageBgClass(stage: string): string {
  const colorMap: Record<string, string> = {
    initial_review: "bg-neutral-400",
    screening: "bg-sky-400", 
    diligence: "bg-blue-500",
    ic_review: "bg-violet-500",
    closing: "bg-amber-500",
    closed: "bg-green-500",
    invested: "bg-emerald-500",
    rejected: "bg-red-500"
  };
  
  return colorMap[stage] || "bg-neutral-400";
}
