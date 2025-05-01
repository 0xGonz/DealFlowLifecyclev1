import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import DealCard from "@/components/deals/DealCard";
import NewDealModal from "@/components/deals/NewDealModal";
import { Button } from "@/components/ui/button";
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DealStageLabels } from "@shared/schema";
import { Plus, Search } from "lucide-react";

export default function Pipeline() {
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("30days");

  const { data: deals, isLoading } = useQuery({
    queryKey: ['/api/deals'],
  });

  // Filter deals based on current filters
  const filteredDeals = deals?.filter(deal => {
    // Stage filter
    if (stageFilter !== "all" && deal.stage !== stageFilter) {
      return false;
    }
    
    // Industry filter
    if (industryFilter !== "all" && deal.industry !== industryFilter) {
      return false;
    }
    
    // Search term
    if (searchTerm && !deal.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !deal.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Date filter (simplified - in a real app would check actual dates)
    if (dateFilter === "30days") {
      // Simplified logic - just returns all for demo
      return true;
    }
    
    return true;
  });
  
  // Get unique industries for filtering
  const industries = deals ? Array.from(new Set(deals.map(deal => deal.industry))).sort() : [];

  // Group deals by stage for the kanban view
  const dealsByStage = filteredDeals?.reduce((acc, deal) => {
    const stage = deal.stage;
    if (!acc[stage]) {
      acc[stage] = [];
    }
    acc[stage].push(deal);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-neutral-800">Deal Pipeline</h1>
          
          <Button 
            onClick={() => setIsNewDealModalOpen(true)}
            className="bg-primary hover:bg-primary-dark text-white"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Deal
          </Button>
        </div>
        
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search deals..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {Object.entries(DealStageLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Last 30 Days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Pipeline Views - List and Kanban */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="kanban">Kanban View</TabsTrigger>
          </TabsList>
          
          {/* List View */}
          <TabsContent value="list" className="space-y-4">
            {isLoading ? (
              <div className="py-12 text-center text-neutral-500">Loading deals...</div>
            ) : filteredDeals?.length === 0 ? (
              <div className="py-12 text-center text-neutral-500">No deals found matching the criteria.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDeals?.map(deal => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Kanban View */}
          <TabsContent value="kanban">
            <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-x-auto">
              {Object.entries(DealStageLabels).map(([stage, label]) => (
                <div key={stage} className="bg-white rounded-lg shadow min-w-[280px]">
                  <div className="p-3 border-b border-neutral-200">
                    <h3 className="font-medium text-neutral-800 flex items-center justify-between">
                      {label}
                      <span className="text-sm bg-neutral-100 px-2 py-1 rounded-full">
                        {dealsByStage?.[stage]?.length || 0}
                      </span>
                    </h3>
                  </div>
                  
                  <div className="p-3 space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto scrollbar-thin">
                    {dealsByStage?.[stage]?.map(deal => (
                      <DealCard key={deal.id} deal={deal} compact />
                    ))}
                    
                    {(!dealsByStage?.[stage] || dealsByStage[stage].length === 0) && (
                      <div className="py-8 text-center text-neutral-400 text-sm">
                        No deals in this stage
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* New Deal Modal */}
        <NewDealModal 
          isOpen={isNewDealModalOpen} 
          onClose={() => setIsNewDealModalOpen(false)} 
        />
      </div>
    </AppLayout>
  );
}
