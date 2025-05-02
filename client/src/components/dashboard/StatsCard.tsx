import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  trendDirection?: "up" | "down" | "auto";
  isLoading?: boolean;
}

export default function StatsCard({
  title,
  value,
  icon,
  trend = 0,
  trendLabel = "",
  trendDirection = "auto",
  isLoading = false
}: StatsCardProps) {
  // Determine if trend is positive (up) or negative (down)
  const isTrendUp = trendDirection === "auto" 
    ? trend > 0 
    : trendDirection === "up";
  
  // Determine trend color
  const trendColorClass = isTrendUp ? "text-success" : "text-danger";

  return (
    <Card className="bg-white p-3 rounded-lg shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-neutral-600 mb-0.5">{title}</p>
          {isLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <h3 className="text-xl font-semibold">{value}</h3>
          )}
        </div>
        <div className="p-1.5 bg-opacity-20 rounded-lg" style={{ backgroundColor: 'var(--primary-light-alpha-20)' }}>
          {icon}
        </div>
      </div>
      
      {trend !== undefined && (
        <div className="mt-1.5 flex items-center text-2xs">
          {isLoading ? (
            <Skeleton className="h-3 w-12" />
          ) : (
            <>
              <span className={`flex items-center ${trendColorClass}`}>
                {isTrendUp ? (
                  <ArrowUp className="h-3 w-3 mr-0.5" />
                ) : (
                  <ArrowDown className="h-3 w-3 mr-0.5" />
                )}
                {Math.abs(trend)} 
              </span>
              {trendLabel && <span className="text-neutral-500 ml-0.5 text-2xs">{trendLabel}</span>}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
