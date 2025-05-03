import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import DealCard from "@/components/deals/DealCard";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Deal } from "@/lib/types";

export default function RecentDeals() {
  const [, navigate] = useLocation();
  const [stageFilter, setStageFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("30days");

  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  // Filter deals based on current filters and limit to most recent 3
  const filteredDeals = deals
    .filter((deal: Deal) => {
      // Stage filter
      if (stageFilter !== "all" && deal.stage !== stageFilter) {
        return false;
      }
      
      // Date filter (simplified for demo)
      if (dateFilter === "30days") {
        // In a real app, we would filter by createdAt date
        return true;
      }
      
      return true;
    })
    .slice(0, 3); // Only show the first 3 deals

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle>Recent Deals</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1">
        <div className="flex flex-col justify-between items-stretch gap-3 mb-5">
          <div className="flex flex-wrap gap-2 w-full space-y-2 sm:space-y-0">
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full xs:w-[48%] sm:w-[120px] md:w-[150px]">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="initial_review">Initial Review</SelectItem>
                <SelectItem value="screening">Screening</SelectItem>
                <SelectItem value="due_diligence">Diligence</SelectItem>
                <SelectItem value="ic_review">IC Review</SelectItem>
                <SelectItem value="closing">Closing</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full xs:w-[48%] sm:w-[120px] md:w-[150px]">
                <SelectValue placeholder="Last 30 Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            <button 
              className="flex items-center justify-center h-8 sm:h-9 px-3 py-1 text-xs sm:text-sm text-primary hover:text-primary-dark ml-auto xs:ml-0 sm:ml-auto mt-2 xs:mt-0"
              onClick={() => navigate("/pipeline")}
            >
              View All
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Deals Grid */}
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
            <p className="text-sm sm:text-base text-neutral-500">Loading deals...</p>
          </div>
        ) : filteredDeals?.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-8 sm:py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-neutral-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm sm:text-base text-neutral-500">No deals found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {filteredDeals.map(deal => (
              <DealCard key={deal.id} deal={deal} compact={false} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}