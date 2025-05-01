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
  const [sectorFilter, setSectorFilter] = useState("all");
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
  const sectors = deals ? Array.from(new Set(deals.map(deal => deal.sector))).sort() : [];
  
  // Predefined sector list (in case we want to show all options)
  const predefinedSectors = [
    "Private Credit", "Buyout", "Crypto", "GP Stakes", "Energy", "Venture",
    "Technology", "SaaS", "Fintech", "AI/ML", "Cybersecurity", "Healthcare", 
    "Biotech", "Renewable Energy", "Clean Tech", "Consumer Goods", "E-commerce", 
    "Retail", "Real Estate", "Other"
  ];

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
        
        {/* Filters */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search deals..."
              className="pl-10 border-neutral-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3">
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-[180px] bg-white border-neutral-300">
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
              <SelectTrigger className="w-[180px] bg-white border-neutral-300">
                <SelectValue placeholder="Expected Return" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Return</SelectItem>
                <SelectItem value="high">15%+</SelectItem>
                <SelectItem value="medium">10-15%</SelectItem>
                <SelectItem value="low">5-10%</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[180px] bg-white border-neutral-300">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(DealStageLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select defaultValue="30days">
              <SelectTrigger className="w-[150px] bg-white border-neutral-300">
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
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full">
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
                    {filteredDeals?.map(deal => (
                      <tr key={deal.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-neutral-900">{deal.name}</div>
                          <div className="text-xs text-neutral-500 mt-1">
                            In DD since {new Date(deal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                            <Select defaultValue={deal.stage}>
                              <SelectTrigger className="w-[160px] h-8">
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
                            <Button variant="ghost" size="icon" asChild>
                              <a href={`/deals/${deal.id}`} title="View Deal">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </a>
                            </Button>
                            <Button variant="ghost" size="icon" asChild>
                              <a href={`/deals/${deal.id}`} title="Edit Deal">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                </svg>
                              </a>
                            </Button>
                            <Button variant="ghost" size="icon" title="Download Documents">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
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
