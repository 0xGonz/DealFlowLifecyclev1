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
    <Card className="bg-white p-2 sm:p-3 rounded-lg shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] xs:text-xs text-neutral-600 mb-0.5">{title}</p>
          {isLoading ? (
            <Skeleton className="h-5 sm:h-6 w-16 sm:w-24" />
          ) : (
            <h3 className="text-base sm:text-lg md:text-xl font-semibold leading-tight">{value}</h3>
          )}
        </div>
        <div className="p-1 sm:p-1.5 bg-opacity-20 rounded-lg" style={{ backgroundColor: 'var(--primary-light-alpha-20)' }}>
          {icon}
        </div>
      </div>
      
      {trendLabel && (
        <div className="mt-1 sm:mt-1.5 flex items-center text-[9px] xs:text-2xs">
          {isLoading ? (
            <Skeleton className="h-2.5 sm:h-3 w-10 sm:w-12" />
          ) : (
            <span className="text-neutral-500 text-[9px] xs:text-2xs">{trendLabel}</span>
          )}
        </div>
      )}
    </Card>
  );
}
