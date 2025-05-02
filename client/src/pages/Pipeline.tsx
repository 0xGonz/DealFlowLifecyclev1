import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import DealCard from "@/components/deals/DealCard";
import NewDealModal from "@/components/deals/NewDealModal";
import EditDealModal from "@/components/deals/EditDealModal";
import AllocateFundModal from "@/components/deals/AllocateFundModal";
import { Button } from "@/components/ui/button";
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DealStageLabels } from "@shared/schema";
import { Plus, Search, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { enrichDealsWithComputedProps } from "@/lib/utils";
import { Deal } from "@/lib/types";

export default function Pipeline() {
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [isEditDealModalOpen, setIsEditDealModalOpen] = useState(false);
  const [isAllocateFundModalOpen, setIsAllocateFundModalOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [selectedDealName, setSelectedDealName] = useState<string>("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const { toast } = useToast();


  const { data: deals, isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  // Filter deals based on current filters
  const filteredDeals = deals?.filter((deal: Deal) => {
    // Stage filter
    if (stageFilter !== "all" && deal.stage !== stageFilter) {
      return false;
    }
    
    // Sector filter
    if (sectorFilter !== "all" && deal.sector !== sectorFilter) {
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
  
  // Get unique sectors for filtering
  const sectors = deals ? Array.from(new Set(deals.map((deal: Deal) => deal.sector))).sort() : [];
  
  // Predefined sector list (in case we want to show all options)
  const predefinedSectors = [
    "Private Credit", "Buyout", "Crypto", "GP Stakes", "Energy", "Venture",
    "Technology", "SaaS", "Fintech", "AI/ML", "Cybersecurity", "Healthcare", 
    "Biotech", "Renewable Energy", "Clean Tech", "Consumer Goods", "E-commerce", 
    "Retail", "Real Estate", "Other"
  ];

  // Group deals by stage for the tab view
  const dealsByStage = filteredDeals?.reduce((acc: Record<string, Deal[]>, deal: Deal) => {
    const stage = deal.stage;
    if (!acc[stage]) {
      acc[stage] = [];
    }
    acc[stage].push(deal);
    return acc;
  }, {} as Record<string, Deal[]>);

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-20">
        {/* Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4 w-full">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search deals..."
              className="pl-10 border-neutral-300 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full md:w-auto">
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-[140px] sm:w-[180px] bg-white border-neutral-300 text-xs sm:text-sm h-9">
                <SelectValue placeholder="All Sectors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                {predefinedSectors.map((sector) => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px] sm:w-[180px] bg-white border-neutral-300 text-xs sm:text-sm h-9">
                <SelectValue placeholder="All Returns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Returns</SelectItem>
                <SelectItem value="high">15%+</SelectItem>
                <SelectItem value="medium">10-15%</SelectItem>
                <SelectItem value="low">5-10%</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[140px] sm:w-[180px] bg-white border-neutral-300 text-xs sm:text-sm h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(DealStageLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value="all" onValueChange={() => {}}>
              <SelectTrigger className="w-[140px] sm:w-[150px] bg-white border-neutral-300 text-xs sm:text-sm h-9">
                <SelectValue placeholder="Any Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Time</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Pipeline Views - Deal Stages as Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <div className="overflow-x-auto pb-2">
            <TabsList className="flex-wrap">
              <TabsTrigger value="all" className="text-xs sm:text-sm py-1.5 px-2.5 sm:px-3">All Deals</TabsTrigger>
              {Object.entries(DealStageLabels).map(([stage, label]) => (
                <TabsTrigger key={stage} value={stage} className="text-xs sm:text-sm py-1.5 px-2.5 sm:px-3">
                  <span className="hidden xs:inline">{label}</span>
                  <span className="inline xs:hidden">{label.substring(0, 3)}</span>
                  <span className="ml-1 sm:ml-2 text-xs bg-neutral-100 px-1.5 sm:px-2 py-0.5 rounded-full">
                    {dealsByStage?.[stage]?.length || 0}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          
          {/* All Deals Tab */}
          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="py-12 text-center text-neutral-500">Loading deals...</div>
            ) : filteredDeals?.length === 0 ? (
              <div className="py-12 text-center text-neutral-500">No deals found matching the criteria.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDeals?.map((deal) => (
                  <DealCard 
                    key={deal.id}
                    deal={deal}
                    onEdit={() => {
                      setSelectedDealId(deal.id);
                      setIsEditDealModalOpen(true);
                    }}
                    onAllocate={() => {
                      setSelectedDealId(deal.id);
                      setSelectedDealName(deal.name);
                      setIsAllocateFundModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Stage Specific Tabs */}
          {Object.entries(DealStageLabels).map(([stage, label]) => (
            <TabsContent key={stage} value={stage} className="space-y-4">
              {isLoading ? (
                <div className="py-12 text-center text-neutral-500">Loading deals...</div>
              ) : !dealsByStage?.[stage] || dealsByStage[stage]?.length === 0 ? (
                <div className="py-12 text-center text-neutral-500">No deals in {label.toLowerCase()} stage.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {dealsByStage[stage]?.map((deal) => (
                    <DealCard 
                      key={deal.id}
                      deal={deal}
                      onEdit={() => {
                        setSelectedDealId(deal.id);
                        setIsEditDealModalOpen(true);
                      }}
                      onAllocate={() => {
                        setSelectedDealId(deal.id);
                        setSelectedDealName(deal.name);
                        setIsAllocateFundModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Add Deal floating action button - mobile only */}
        <div className="fixed right-4 bottom-4 md:hidden">
          <Button 
            onClick={() => setIsNewDealModalOpen(true)}
            className="h-12 w-12 rounded-full bg-primary hover:bg-primary-dark shadow-lg"
          >
            <Plus className="h-5 w-5 text-white" />
          </Button>
        </div>

        {/* Modals */}
        <NewDealModal
          isOpen={isNewDealModalOpen}
          onClose={() => setIsNewDealModalOpen(false)}
        />
        
        {selectedDealId && (
          <EditDealModal
            isOpen={isEditDealModalOpen}
            onClose={() => setIsEditDealModalOpen(false)}
            dealId={selectedDealId}
          />
        )}
        
        {selectedDealId && (
          <AllocateFundModal
            isOpen={isAllocateFundModalOpen}
            onClose={() => setIsAllocateFundModalOpen(false)}
            dealId={selectedDealId}
            dealName={selectedDealName}
          />
        )}
      </div>
    </AppLayout>
  );
}
