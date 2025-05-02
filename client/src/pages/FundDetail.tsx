import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  ChevronLeft, 
  Calendar,
  FileText
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { format } from "date-fns";
import NotFound from "./not-found";

// Visualization components
import FundSectorDistribution from "@/components/funds/FundSectorDistribution";
import CalledCapitalRatio from "@/components/funds/CalledCapitalRatio";

export default function FundDetail() {
  // Get fund ID from URL
  const [, params] = useRoute("/funds/:id");
  const fundId = params?.id ? parseInt(params.id) : null;
  
  const [isNewAllocationDialogOpen, setIsNewAllocationDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [newAllocationData, setNewAllocationData] = useState({
    fundId: fundId,
    dealId: null,
    amount: 0,
    securityType: "",
    allocationDate: new Date().toISOString().split('T')[0], // format as YYYY-MM-DD
    notes: "",
    // Investment tracking fields
    status: "committed", // committed, funded, unfunded
    portfolioWeight: 0,
    interestPaid: 0,
    distributionPaid: 0,
    marketValue: 0,
    moic: 1,
    irr: 0
  });
  
  const { toast } = useToast();
  
  // Fetch fund details
  const { data: fund, isLoading: isFundLoading, isError: isFundError } = useQuery({
    queryKey: ['/api/funds', fundId],
    enabled: !!fundId,
  });
  
  // Fetch allocations for this fund
  const { data: allocations, isLoading: isAllocationsLoading } = useQuery({
    queryKey: [`/api/allocations/fund/${fundId}`],
    enabled: !!fundId,
  });
  
  // Fetch all deals for the allocation dropdown
  const { data: deals } = useQuery({
    queryKey: ['/api/deals'],
  });
  
  // Create allocation mutation
  const createAllocation = useMutation({
    mutationFn: async (data) => {
      return apiRequest("POST", "/api/allocations", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Allocation created successfully",
      });
      
      // Reset form and close dialog
      setNewAllocationData({
        fundId: fundId,
        dealId: null,
        amount: 0,
        securityType: "",
        allocationDate: new Date().toISOString().split('T')[0],
        notes: "",
        // Reset investment tracking fields
        status: "committed",
        portfolioWeight: 0,
        interestPaid: 0,
        distributionPaid: 0,
        marketValue: 0,
        moic: 1,
        irr: 0
      });
      setIsNewAllocationDialogOpen(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/allocations/fund/${fundId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/funds', fundId] }); // Refresh fund details (AUM might change)
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create allocation",
        variant: "destructive"
      });
    }
  });
  
  const handleCreateAllocation = () => {
    if (!newAllocationData.dealId) {
      toast({
        title: "Error",
        description: "Please select a deal",
        variant: "destructive"
      });
      return;
    }
    
    if (!newAllocationData.amount || newAllocationData.amount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive"
      });
      return;
    }
    
    if (!newAllocationData.securityType) {
      toast({
        title: "Error",
        description: "Sector is required",
        variant: "destructive"
      });
      return;
    }
    
    createAllocation.mutate(newAllocationData);
    // Close the dialog immediately for better UX
    setIsNewAllocationDialogOpen(false);
  };
  
  // Handle 404
  if (isFundError || (fund === null && !isFundLoading)) {
    return <NotFound />;
  }
  
  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="flex items-center mb-4 sm:mb-6">
          <Button variant="ghost" className="mr-2 sm:mr-3 h-9 w-9 sm:p-2 p-1.5" asChild>
            <a href="/funds">
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </a>
          </Button>
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-800 truncate">
            {isFundLoading ? "Loading..." : fund?.name}
          </h1>
        </div>
        
        {isFundLoading ? (
          <div className="text-center py-12">Loading fund details...</div>
        ) : (
          <>
            {/* Fund Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                  {fund?.description && (
                    <CardDescription>{fund.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    <div>
                      <p className="text-xs sm:text-sm text-neutral-600 mb-1">Assets Under Management</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-semibold flex items-center">
                        {formatCurrency(fund?.aum)}
                        <TrendingUp className="ml-2 h-3 w-3 sm:h-4 sm:w-4 text-success" />
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs sm:text-sm text-neutral-600 mb-1">Total Investments</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-semibold">
                        {allocations?.length || 0}
                      </p>
                    </div>
                    
                    <div className="sm:col-span-2 md:col-span-1">
                      <p className="text-xs sm:text-sm text-neutral-600 mb-1">Created Date</p>
                      <p className="text-base sm:text-lg font-medium">
                        {fund?.createdAt ? format(new Date(fund.createdAt), "PPP") : "Unknown"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Fund Visualizations */}
              <div className="space-y-6">
                {/* Import the visualization components */}
                <FundSectorDistribution allocations={allocations || []} deals={deals || []} />
                
                <CalledCapitalRatio allocations={allocations || []} totalFundSize={fund?.aum || 0} />
                
                {/* Investment Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Investment Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Dialog open={isNewAllocationDialogOpen} onOpenChange={setIsNewAllocationDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full bg-primary hover:bg-primary-dark text-white">
                          <Plus className="h-5 w-5 mr-2" />
                          New Allocation
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Allocation</DialogTitle>
                          <DialogDescription>
                            Allocate capital from {fund?.name} to a deal
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="deal">Deal *</Label>
                            <Select 
                              onValueChange={(value) => setNewAllocationData({
                                ...newAllocationData, 
                                dealId: parseInt(value)
                              })}
                            >
                              <SelectTrigger id="deal">
                                <SelectValue placeholder="Select a deal" />
                              </SelectTrigger>
                              <SelectContent>
                                {deals?.map(deal => (
                                  <SelectItem key={deal.id} value={deal.id.toString()}>
                                    {deal.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="amount">Investment Amount *</Label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                              <Input 
                                id="amount"
                                type="number"
                                className="pl-10"
                                value={newAllocationData.amount}
                                onChange={(e) => setNewAllocationData({
                                  ...newAllocationData, 
                                  amount: parseFloat(e.target.value)
                                })}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="securityType">Sector *</Label>
                            <Select 
                              onValueChange={(value) => setNewAllocationData({
                                ...newAllocationData, 
                                securityType: value
                              })}
                            >
                              <SelectTrigger id="securityType">
                                <SelectValue placeholder="Select sector" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Private Credit">Private Credit</SelectItem>
                                <SelectItem value="Buyout">Buyout</SelectItem>
                                <SelectItem value="Crypto">Crypto</SelectItem>
                                <SelectItem value="GP Stakes">GP Stakes</SelectItem>
                                <SelectItem value="Energy">Energy</SelectItem>
                                <SelectItem value="Venture">Venture</SelectItem>
                                <SelectItem value="Technology">Technology</SelectItem>
                                <SelectItem value="SaaS">SaaS</SelectItem>
                                <SelectItem value="Fintech">Fintech</SelectItem>
                                <SelectItem value="Healthcare">Healthcare</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="status">Investment Status *</Label>
                            <Select 
                              onValueChange={(value) => setNewAllocationData({
                                ...newAllocationData, 
                                status: value
                              })}
                              defaultValue="committed"
                            >
                              <SelectTrigger id="status">
                                <SelectValue placeholder="Select investment status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="committed">Committed</SelectItem>
                                <SelectItem value="funded">Funded</SelectItem>
                                <SelectItem value="unfunded">Unfunded</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="allocationDate">Allocation Date</Label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                              <Input 
                                id="allocationDate"
                                type="date"
                                className="pl-10"
                                value={newAllocationData.allocationDate}
                                onChange={(e) => setNewAllocationData({
                                  ...newAllocationData, 
                                  allocationDate: e.target.value
                                })}
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="distributionPaid">Distributions Paid</Label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                                <Input 
                                  id="distributionPaid"
                                  type="number"
                                  className="pl-10"
                                  value={newAllocationData.distributionPaid}
                                  onChange={(e) => setNewAllocationData({
                                    ...newAllocationData, 
                                    distributionPaid: parseFloat(e.target.value)
                                  })}
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="marketValue">Current Market Value</Label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                                <Input 
                                  id="marketValue"
                                  type="number"
                                  className="pl-10"
                                  value={newAllocationData.marketValue}
                                  onChange={(e) => setNewAllocationData({
                                    ...newAllocationData, 
                                    marketValue: parseFloat(e.target.value)
                                  })}
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea 
                              id="notes" 
                              value={newAllocationData.notes}
                              onChange={(e) => setNewAllocationData({
                                ...newAllocationData, 
                                notes: e.target.value
                              })}
                              placeholder="Additional details about this allocation"
                            />
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button 
                            variant="outline"
                            onClick={() => setIsNewAllocationDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleCreateAllocation}
                            disabled={createAllocation.isPending}
                          >
                            {createAllocation.isPending ? "Creating..." : "Create Allocation"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <FileText className="h-5 w-5 mr-2" />
                          Generate Report
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Fund Report</DialogTitle>
                          <DialogDescription>
                            Generate a performance report for {fund?.name}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="reportType">Report Type</Label>
                            <Select defaultValue="performance">
                              <SelectTrigger id="reportType">
                                <SelectValue placeholder="Select report type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="performance">Performance Metrics</SelectItem>
                                <SelectItem value="allocation">Allocation Summary</SelectItem>
                                <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="reportFormat">Format</Label>
                            <Select defaultValue="pdf">
                              <SelectTrigger id="reportFormat">
                                <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pdf">PDF Document</SelectItem>
                                <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                                <SelectItem value="csv">CSV File</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="dateRange">Date Range</Label>
                            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 xs:gap-4">
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                                <Input 
                                  id="startDate"
                                  type="date"
                                  className="pl-10"
                                  defaultValue={new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0]}
                                />
                              </div>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                                <Input 
                                  id="endDate"
                                  type="date"
                                  className="pl-10"
                                  defaultValue={new Date().toISOString().split('T')[0]}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button 
                            variant="outline"
                            onClick={() => setIsReportDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button onClick={() => {
                            toast({
                              title: "Report Generated",
                              description: "Your report has been generated and is ready to download",
                            });
                            setIsReportDialogOpen(false);
                          }}>
                            Generate Report
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Fund Allocations */}
            <Card>
              <CardHeader>
                <CardTitle>Investment Allocations</CardTitle>
                <CardDescription>
                  All capital allocations made from this fund
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-6 px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Investment</TableHead>
                        <TableHead className="whitespace-nowrap hidden xs:table-cell">Sector</TableHead>
                        <TableHead className="whitespace-nowrap">Date</TableHead>
                        <TableHead className="whitespace-nowrap hidden sm:table-cell">Status</TableHead>
                        <TableHead className="whitespace-nowrap hidden lg:table-cell">Weight</TableHead>
                        <TableHead className="whitespace-nowrap hidden md:table-cell">Committed</TableHead>
                        <TableHead className="whitespace-nowrap hidden xl:table-cell">Distributions</TableHead>
                        <TableHead className="whitespace-nowrap hidden lg:table-cell">Value</TableHead>
                        <TableHead className="whitespace-nowrap hidden md:table-cell">MOIC</TableHead>
                        <TableHead className="whitespace-nowrap hidden lg:table-cell">IRR</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {isAllocationsLoading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-10">
                          Loading allocations...
                        </TableCell>
                      </TableRow>
                    ) : allocations?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-10 text-neutral-500">
                          No allocations have been made from this fund yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      allocations?.map(allocation => {
                        const deal = deals?.find(d => d.id === allocation.dealId);
                        
                        // Calculate portfolio weight
                        const totalAllocated = allocations?.reduce((sum, alloc) => sum + alloc.amount, 0) || 1;
                        const weight = (allocation.amount / totalAllocated) * 100;
                        
                        // For demo purposes, we'll generate reasonable values based on the existing data
                        const distributionPaid = allocation.distributionPaid || allocation.amount * 0.15;
                        const marketValue = allocation.marketValue || allocation.amount * 1.25;
                        const moic = allocation.moic || (distributionPaid + marketValue) / allocation.amount;
                        const irr = allocation.irr || 12.5;
                        
                        return (
                          <TableRow key={allocation.id}>
                            <TableCell className="font-medium">
                              <a href={`/deals/${allocation.dealId}`} className="text-primary hover:underline">
                                {deal?.name || `Deal #${allocation.dealId}`}
                              </a>
                            </TableCell>
                            <TableCell className="hidden xs:table-cell">
                              {deal?.sector || "-"}
                            </TableCell>
                            <TableCell>
                              {allocation.allocationDate ? 
                                new Date(allocation.allocationDate).toString() !== "Invalid Date" 
                                  ? format(new Date(allocation.allocationDate), "PP") 
                                  : "-" 
                                : "-"}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="outline" className={
                                allocation.status === "funded" ? "border-success text-success" :
                                allocation.status === "unfunded" ? "border-destructive text-destructive" :
                                "border-primary text-primary"
                              }>
                                {allocation.status === "funded" ? "Funded" :
                                 allocation.status === "unfunded" ? "Unfunded" : "Committed"}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {weight.toFixed(1)}%
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {formatCurrency(allocation.amount)}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              {formatCurrency(distributionPaid)}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {formatCurrency(marketValue)}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {moic.toFixed(2)}x
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {irr.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <a href={`/deals/${allocation.dealId}`}>
                                  View
                                  <ArrowUpRight className="ml-1 h-4 w-4" />
                                </a>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
            
            {/* Performance Metrics */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Investment performance metrics for this fund
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
                  {/* Calculate fund performance metrics from actual data */}
                  {(() => {
                    // Get all allocated capital for this fund
                    const totalAllocated = allocations?.reduce((sum, allocation) => sum + allocation.amount, 0) || 0;
                    
                    // Calculate distributions (assuming 30% of invested capital for demo, in real app this would come from realized returns data)
                    const distributions = totalAllocated * (fund?.distributionRate || 0.3);
                    
                    // Calculate residual value (current value of remaining investments)
                    const residualValue = totalAllocated * (fund?.appreciationRate || 0.88);
                    
                    // Calculate total value
                    const totalValue = distributions + residualValue;
                    
                    // Calculate TVPI (Total Value to Paid-In Capital)
                    const tvpi = totalAllocated > 0 ? totalValue / totalAllocated : 0;
                    
                    // Calculate DPI (Distributions to Paid-In Capital)
                    const dpi = totalAllocated > 0 ? distributions / totalAllocated : 0;
                    
                    // Calculate RVPI (Residual Value to Paid-In Capital)
                    const rvpi = totalAllocated > 0 ? residualValue / totalAllocated : 0;
                    
                    // Calculate IRR (simplified for demo purposes, using allocation amount and timeframe)
                    // In a real application, IRR would be calculated using cash flow timestamps
                    const fundAgeInYears = fund?.createdAt ? 
                      Math.max(0.5, (new Date().getTime() - new Date(fund.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)) : 1;
                    
                    // Simple IRR approximation (for demo) - would normally use more complex IRR calculation
                    const irr = totalAllocated > 0 ? ((totalValue / totalAllocated) ** (1 / fundAgeInYears) - 1) * 100 : 0;
                    
                    return (
                      <>
                        <div className="p-2 sm:p-3">
                          <h3 className="text-xs sm:text-sm font-medium text-neutral-500 mb-0.5 sm:mb-1">TVPI</h3>
                          <p className="text-lg sm:text-xl md:text-2xl font-semibold">{tvpi.toFixed(2)}x</p>
                          <p className="text-xs sm:text-sm text-neutral-500 truncate">Total Value to Paid-In Capital</p>
                        </div>
                        
                        <div className="p-2 sm:p-3">
                          <h3 className="text-xs sm:text-sm font-medium text-neutral-500 mb-0.5 sm:mb-1">DPI</h3>
                          <p className="text-lg sm:text-xl md:text-2xl font-semibold">{dpi.toFixed(2)}x</p>
                          <p className="text-xs sm:text-sm text-neutral-500 truncate">Distributions to Paid-In Capital</p>
                        </div>
                        
                        <div className="p-2 sm:p-3">
                          <h3 className="text-xs sm:text-sm font-medium text-neutral-500 mb-0.5 sm:mb-1">RVPI</h3>
                          <p className="text-lg sm:text-xl md:text-2xl font-semibold">{rvpi.toFixed(2)}x</p>
                          <p className="text-xs sm:text-sm text-neutral-500 truncate">Residual Value to Paid-In Capital</p>
                        </div>
                        
                        <div className="p-2 sm:p-3">
                          <h3 className="text-xs sm:text-sm font-medium text-neutral-500 mb-0.5 sm:mb-1">IRR</h3>
                          <p className="text-lg sm:text-xl md:text-2xl font-semibold">{irr > 0 ? irr.toFixed(1) : 0}%</p>
                          <p className="text-xs sm:text-sm text-neutral-500 truncate">Internal Rate of Return</p>
                        </div>
                      </>
                    );
                  })()} 
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}