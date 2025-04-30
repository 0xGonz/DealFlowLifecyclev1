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
    <Card className="bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-neutral-600 mb-1">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <h3 className="text-2xl font-semibold">{value}</h3>
          )}
        </div>
        <div className="p-2 bg-opacity-20 rounded-lg" style={{ backgroundColor: 'var(--primary-light-alpha-20)' }}>
          {icon}
        </div>
      </div>
      
      {trend !== undefined && (
        <div className="mt-3 flex items-center text-xs">
          {isLoading ? (
            <Skeleton className="h-4 w-16" />
          ) : (
            <>
              <span className={`flex items-center ${trendColorClass}`}>
                {isTrendUp ? (
                  <ArrowUp className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(trend)} 
              </span>
              {trendLabel && <span className="text-neutral-500 ml-1">{trendLabel}</span>}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
