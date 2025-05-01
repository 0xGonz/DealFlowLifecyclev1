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
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2 ml-auto">
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="h-9 w-[150px]">
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
              <SelectTrigger className="h-9 w-[150px]">
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
              className="flex items-center justify-center px-4 py-2 text-sm text-primary hover:text-primary-dark"
              onClick={() => navigate("/pipeline")}
            >
              View All
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Deals Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <p className="text-neutral-500">Loading deals...</p>
          </div>
        ) : filteredDeals?.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <p className="text-neutral-500">No deals found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredDeals.map(deal => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}