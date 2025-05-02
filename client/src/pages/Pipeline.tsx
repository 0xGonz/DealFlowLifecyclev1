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

  // Define interface for Deal type
  interface Deal {
    id: number;
    name: string;
    description: string;
    stage: keyof typeof DealStageLabels;
    sector: string;
    createdAt: string;
    targetRaise?: number;
  }

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
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4 w-full">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search deals..."
              className="pl-10 border-neutral-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white border-neutral-300">
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
              <SelectTrigger className="w-full sm:w-[180px] bg-white border-neutral-300">
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
              <SelectTrigger className="w-full sm:w-[180px] bg-white border-neutral-300">
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
              <SelectTrigger className="w-full sm:w-[150px] bg-white border-neutral-300">
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
              <TabsTrigger value="all">All Deals</TabsTrigger>
              {Object.entries(DealStageLabels).map(([stage, label]) => (
                <TabsTrigger key={stage} value={stage}>
                  {label}
                  <span className="ml-2 text-xs bg-neutral-100 px-2 py-0.5 rounded-full">
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
              <div className="bg-white rounded-lg shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-neutral-50 border-b">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-neutral-500">Name</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-neutral-500">Sector</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-neutral-500">Description</th>
                      <th className="text-center px-6 py-3 text-sm font-medium text-neutral-500">Return</th>
                      <th className="text-center px-6 py-3 text-sm font-medium text-neutral-500">Status</th>
                      <th className="text-center px-6 py-3 text-sm font-medium text-neutral-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {filteredDeals?.map((deal: Deal) => (
                      <tr key={deal.id} className="hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/deals/${deal.id}`}>
                        <td className="px-6 py-4">
                          <div className="font-medium text-neutral-900">{deal.name}</div>
                          <div className="text-xs text-neutral-500 mt-1">
                            {deal.stage === 'diligence' ? 'In Diligence' : DealStageLabels[deal.stage]} since {new Date(deal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-neutral-600">{deal.sector}</td>
                        <td className="px-6 py-4 text-neutral-600 max-w-md">
                          <div className="line-clamp-2">{deal.description}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-medium">
                          {deal.targetRaise ? `${Math.floor(Math.random() * 30) + 5}%` : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex">
                            <Select 
                              defaultValue={deal.stage} 
                              onValueChange={async (newStage) => {
                                try {
                                  // Update the deal's stage
                                  await apiRequest("PATCH", `/api/deals/${deal.id}`, {
                                    stage: newStage
                                  });
                                  
                                  // Invalidate queries to refresh data
                                  queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
                                  
                                  // Show success message
                                  toast({
                                    title: "Stage Updated",
                                    description: `Deal moved to ${DealStageLabels[newStage as keyof typeof DealStageLabels]}`
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to update deal stage",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="w-[160px] h-8" onClick={(e) => e.stopPropagation()}>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(DealStageLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              title="Edit Deal" 
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click
                                setSelectedDealId(deal.id);
                                setIsEditDealModalOpen(true);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              </svg>
                            </Button>
                            <Button variant="ghost" size="icon" title="Documents" asChild
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click
                              }}
                            >
                              <a href={`/deals/${deal.id}?tab=workflow`}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                  <polyline points="14 2 14 8 20 8" />
                                </svg>
                              </a>
                            </Button>
                            <Button variant="ghost" size="icon" title="Quick Action Menu">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="19" r="1" />
                              </svg>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                <div className="bg-white rounded-lg shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-neutral-50 border-b">
                      <tr>
                        <th className="text-left px-6 py-3 text-sm font-medium text-neutral-500">Name</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-neutral-500">Sector</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-neutral-500">Description</th>
                        <th className="text-center px-6 py-3 text-sm font-medium text-neutral-500">Return</th>
                        <th className="text-center px-6 py-3 text-sm font-medium text-neutral-500">Status</th>
                        <th className="text-center px-6 py-3 text-sm font-medium text-neutral-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {dealsByStage[stage].map((deal: Deal) => (
                        <tr key={deal.id} className="hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/deals/${deal.id}`}>
                          <td className="px-6 py-4">
                            <div className="font-medium text-neutral-900">{deal.name}</div>
                            <div className="text-xs text-neutral-500 mt-1">
                              {deal.stage === 'diligence' ? 'In Diligence' : DealStageLabels[deal.stage]} since {new Date(deal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-neutral-600">{deal.sector}</td>
                          <td className="px-6 py-4 text-neutral-600 max-w-md">
                            <div className="line-clamp-2">{deal.description}</div>
                          </td>
                          <td className="px-6 py-4 text-center font-medium">
                            {deal.targetRaise ? `${Math.floor(Math.random() * 30) + 5}%` : '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex">
                              <Select 
                                defaultValue={deal.stage} 
                                onValueChange={async (newStage) => {
                                  try {
                                    // Update the deal's stage
                                    await apiRequest("PATCH", `/api/deals/${deal.id}`, {
                                      stage: newStage
                                    });
                                    
                                    // Invalidate queries to refresh data
                                    queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
                                    
                                    // Show success message
                                    toast({
                                      title: "Stage Updated",
                                      description: `Deal moved to ${DealStageLabels[newStage as keyof typeof DealStageLabels]}`
                                    });
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Failed to update deal stage",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[160px] h-8" onClick={(e) => e.stopPropagation()}>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(DealStageLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                title="Edit Deal" 
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row click
                                  setSelectedDealId(deal.id);
                                  setIsEditDealModalOpen(true);
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                </svg>
                              </Button>
                              <Button variant="ghost" size="icon" title="Documents" asChild
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row click
                                }}
                              >
                                <a href={`/deals/${deal.id}?tab=workflow`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                    <polyline points="14 2 14 8 20 8" />
                                  </svg>
                                </a>
                              </Button>
                              
                              {/* Show Allocate Fund button when in Invested stage */}
                              {stage === 'invested' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  title="Allocate to Fund"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Open allocate fund modal
                                    setSelectedDealId(deal.id);
                                    setSelectedDealName(deal.name);
                                    setIsAllocateFundModalOpen(true);
                                  }}
                                >
                                  <DollarSign className="w-4 h-4" />
                                </Button>
                              )}
                              
                              {/* Show Next Stage button when applicable */}
                              {Object.keys(DealStageLabels)[Object.keys(DealStageLabels).indexOf(stage as keyof typeof DealStageLabels) + 1] && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  title="Move to Next Stage"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    // Get next stage
                                    const stages = Object.keys(DealStageLabels) as Array<keyof typeof DealStageLabels>;
                                    const currentIndex = stages.indexOf(stage as keyof typeof DealStageLabels);
                                    const nextStage = stages[currentIndex + 1];
                                    
                                    if (nextStage) {
                                      try {
                                        // Update the deal's stage
                                        await apiRequest("PATCH", `/api/deals/${deal.id}`, {
                                          stage: nextStage
                                        });
                                        
                                        // Invalidate queries to refresh data
                                        queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
                                        
                                        // Show success message
                                        toast({
                                          title: "Stage Updated",
                                          description: `Deal moved to ${DealStageLabels[nextStage]}`
                                        });
                                      } catch (error) {
                                        toast({
                                          title: "Error",
                                          description: "Failed to update deal stage",
                                          variant: "destructive"
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                  </svg>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
        
        {/* New Deal Modal */}
        <NewDealModal 
          isOpen={isNewDealModalOpen} 
          onClose={() => setIsNewDealModalOpen(false)} 
        />
        
        {/* Edit Deal Modal */}
        {selectedDealId && (
          <EditDealModal 
            isOpen={isEditDealModalOpen} 
            onClose={() => {
              setIsEditDealModalOpen(false);
              setSelectedDealId(null);
            }} 
            dealId={selectedDealId} 
          />
        )}
        
        {/* Allocate Fund Modal */}
        {selectedDealId && (
          <AllocateFundModal
            isOpen={isAllocateFundModalOpen}
            onClose={() => {
              setIsAllocateFundModalOpen(false);
              setSelectedDealId(null);
            }}
            dealId={selectedDealId}
            dealName={selectedDealName}
          />
        )}
      </div>
    </AppLayout>
  );
}