import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { generateDealNotification } from "@/lib/utils/notification-utils";
import AppLayout from "@/components/layout/AppLayout";
import DealCard from "@/components/deals/DealCard";
import DealsTable from "@/components/deals/DealsTable";
import NewDealModal from "@/components/deals/NewDealModal";
import EditDealModal from "@/components/deals/EditDealModal";
import AllocateFundModal from "@/components/deals/AllocateFundModal";
import PipelineStats from "@/components/pipeline/PipelineStats";
import StageDistribution from "@/components/pipeline/StageDistribution";
import SectorDistribution from "@/components/pipeline/SectorDistribution";
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
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";

export default function Pipeline() {
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [isEditDealModalOpen, setIsEditDealModalOpen] = useState(false);
  const [isAllocateFundModalOpen, setIsAllocateFundModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [selectedDealName, setSelectedDealName] = useState<string>("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  // Mutation for updating deal status
  const updateDealStatusMutation = useMutation({
    mutationFn: async ({ dealId, stage }: { dealId: number; stage: string }) => {
      return apiRequest("PATCH", `/api/deals/${dealId}`, { stage });
    },
    onSuccess: async (data: any) => {
      // Show success toast
      toast({
        title: "Status updated",
        description: `Deal has been moved to ${DealStageLabels[data.stage as keyof typeof DealStageLabels]}`,
      });
      
      // Create notification for stage change
      try {
        // Pass the new stage to the notification function
        await generateDealNotification(1, data.name, 'moved', data.id, data.stage);
        
        // Refresh notifications in the UI
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      } catch (err) {
        console.error('Failed to create notification:', err);
      }
      
      // Refresh deals data
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: "Failed to update deal status. Please try again.",
        variant: "destructive"
      });
    }
  });

  const { data: rawDeals, isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });
  
  // Apply computed properties to all deals
  const deals = rawDeals ? enrichDealsWithComputedProps(rawDeals) : undefined;

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
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4 w-full">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <Input
              type="text"
              placeholder="Search deals..."
              className="pl-8 sm:pl-10 h-8 sm:h-9 border-neutral-300 text-xs sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0">
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-full h-8 sm:h-9 sm:w-[130px] md:w-[140px] bg-white border-neutral-300 text-[10px] xs:text-xs sm:text-sm">
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
              <SelectTrigger className="w-full h-8 sm:h-9 sm:w-[130px] md:w-[140px] bg-white border-neutral-300 text-[10px] xs:text-xs sm:text-sm">
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
              <SelectTrigger className="w-full h-8 sm:h-9 sm:w-[130px] md:w-[140px] bg-white border-neutral-300 text-[10px] xs:text-xs sm:text-sm">
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
              <SelectTrigger className="w-full h-8 sm:h-9 sm:w-[130px] md:w-[140px] bg-white border-neutral-300 text-[10px] xs:text-xs sm:text-sm">
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
              <>
                {/* Pipeline stats and visualizations for all deals */}
                <PipelineStats deals={deals} filteredDeals={filteredDeals} stage="all" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <StageDistribution deals={filteredDeals} stage="all" />
                  <SectorDistribution deals={filteredDeals} stage="all" />
                </div>
                
                <DealsTable 
                  deals={filteredDeals}
                  isLoading={isLoading}
                  onEdit={(dealId) => {
                    setSelectedDealId(dealId);
                    setIsEditDealModalOpen(true);
                  }}
                  onAllocate={(dealId, dealName) => {
                    setSelectedDealId(dealId);
                    setSelectedDealName(dealName);
                    setIsAllocateFundModalOpen(true);
                  }}
                  onUpdateStatus={(dealId, stage) => {
                    updateDealStatusMutation.mutate({ dealId, stage });
                  }}
                />
              </>
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
                <>
                  {/* Pipeline stats and visualizations for stage-specific deals */}
                  <PipelineStats deals={deals} filteredDeals={dealsByStage[stage]} stage={stage} />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <StageDistribution deals={dealsByStage[stage]} stage={stage} />
                    <SectorDistribution deals={dealsByStage[stage]} stage={stage} />
                  </div>
                  
                  <DealsTable 
                    deals={dealsByStage[stage]}
                    isLoading={isLoading}
                    onEdit={(dealId) => {
                      setSelectedDealId(dealId);
                      setIsEditDealModalOpen(true);
                    }}
                    onAllocate={(dealId, dealName) => {
                      setSelectedDealId(dealId);
                      setSelectedDealName(dealName);
                      setIsAllocateFundModalOpen(true);
                    }}
                    onUpdateStatus={(dealId, stage) => {
                      updateDealStatusMutation.mutate({ dealId, stage });
                    }}
                  />
                </>
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
