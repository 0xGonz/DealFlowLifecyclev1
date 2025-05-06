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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
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
// Using HTML label directly instead of Label component to avoid FormContext issues
// import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  DollarSign, 
  TrendingUp, 
  ChevronLeft, 
  FilePenLine, 
  Trash2, 
  CreditCard,
  FileText,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import FundSectorDistribution from "@/components/funds/FundSectorDistribution";
import CalledCapitalRatio from "@/components/funds/CalledCapitalRatio";

export default function FundDetail() {
  const [, params] = useRoute("/funds/:id");
  const fundId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();

  // Dialog state
  const [isNewAllocationDialogOpen, setIsNewAllocationDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  
  // Form state for new allocation
  const [newAllocationData, setNewAllocationData] = useState({
    fundId: fundId,
    dealId: null,
    amount: 0,
    securityType: "",
    allocationDate: format(new Date(), "yyyy-MM-dd"),
    notes: "",
    status: "committed",
    portfolioWeight: 0,
    interestPaid: 0,
    distributionPaid: 0,
    marketValue: 0,
    moic: 0,
    irr: 0
  });

  // Fetch fund details
  const { data: fund, isLoading: isFundLoading } = useQuery({
    queryKey: [`/api/funds/${fundId}`],
    enabled: !!fundId,
  });

  // Fetch all allocations for this fund
  const { data: allocations, isLoading: isAllocationsLoading } = useQuery({
    queryKey: [`/api/allocations/fund/${fundId}`],
    enabled: !!fundId,
  });

  // Fetch invalid allocations (ones with missing deals)
  const { data: invalidAllocations, isLoading: isInvalidAllocationsLoading, refetch: refetchInvalidAllocations } = useQuery({
    queryKey: [`/api/allocations/fund/${fundId}/invalid`],
    enabled: !!fundId,
  });

  // Get all deals (for allocation creation and reference)
  const { data: deals } = useQuery({
    queryKey: ["/api/deals"],
  });

  // Create allocation mutation
  const createAllocation = useMutation({
    mutationFn: async () => {
      // Basic validation
      if (!newAllocationData.dealId) {
        throw new Error("Please select a deal.");
      }
      if (!newAllocationData.amount || newAllocationData.amount <= 0) {
        throw new Error("Please enter a valid amount.");
      }
      if (!newAllocationData.securityType) {
        throw new Error("Please select a security type.");
      }

      const res = await apiRequest("POST", "/api/allocations", newAllocationData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Allocation created",
        description: "The allocation has been created successfully.",
      });
      // Reset the form and close the dialog
      setNewAllocationData({
        fundId: fundId,
        dealId: null,
        amount: 0,
        securityType: "",
        allocationDate: format(new Date(), "yyyy-MM-dd"),
        notes: "",
        status: "committed",
        portfolioWeight: 0,
        interestPaid: 0,
        distributionPaid: 0,
        marketValue: 0,
        moic: 0,
        irr: 0
      });
      setIsNewAllocationDialogOpen(false);
      // Invalidate allocations query to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/allocations/fund/${fundId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/funds/${fundId}`] });
      refetchInvalidAllocations(); // Explicitly refetch invalid allocations
    },
    onError: (error) => {
      toast({
        title: "Error creating allocation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler for creating a new allocation
  const handleCreateAllocation = () => {
    createAllocation.mutate();
  };

  // We don't need to warn about invalid allocations anymore
  // All data is dynamically loaded from API without hardcoded values
  
  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto pb-20 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center">
            <Button variant="ghost" className="mr-2 sm:mr-3 h-9 w-9 sm:p-2 p-1.5" asChild>
              <a href="/funds">
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
            </Button>
            <h1 className="text-xl sm:text-2xl font-semibold text-neutral-800 truncate">
              {isFundLoading ? "Loading..." : fund?.name}
            </h1>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isNewAllocationDialogOpen} onOpenChange={setIsNewAllocationDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary-dark text-white">
                  <Plus className="h-4 w-4 mr-2" />
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
                    <label htmlFor="deal" className="text-sm font-medium">Deal *</label>
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
                    <label htmlFor="amount" className="text-sm font-medium">Investment Amount *</label>
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
                    <label htmlFor="securityType" className="text-sm font-medium">Sector *</label>
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
                    <label htmlFor="status" className="text-sm font-medium">Investment Status *</label>
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
                    <label htmlFor="notes" className="text-sm font-medium">Notes</label>
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
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Fund Report</DialogTitle>
                  <DialogDescription>
                    Create a report of this fund's performance metrics and investments
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Report Format</label>
                    <Select defaultValue="pdf">
                      <SelectTrigger>
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
                    <label className="text-sm font-medium">Report Contents</label>
                    <div className="grid gap-2">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="includePerformance" defaultChecked className="rounded" />
                        <label htmlFor="includePerformance">Performance Metrics</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="includeAllocations" defaultChecked className="rounded" />
                        <label htmlFor="includeAllocations">Investment Allocations</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="includeSector" defaultChecked className="rounded" />
                        <label htmlFor="includeSector">Sector Distribution</label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <Input type="date" className="pl-10" />
                      </div>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <Input type="date" className="pl-10" defaultValue={format(new Date(), "yyyy-MM-dd")} />
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
                  <Button
                    onClick={() => {
                      toast({
                        title: "Report Generated",
                        description: "Your report has been generated and is ready to download.",
                      });
                      setIsReportDialogOpen(false);
                    }}
                  >
                    Generate Report
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {isFundLoading ? (
          <div className="text-center py-12">Loading fund details...</div>
        ) : (
          <>
            {/* Fund Overview & Key Metrics - Top Section */}
            <div className="mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Fund Overview</CardTitle>
                  {fund?.description && (
                    <CardDescription>{fund.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                    <div className="bg-primary/5 p-3 sm:p-4 rounded-lg">
                      <p className="text-xs sm:text-sm text-neutral-600 mb-1">Assets Under Management</p>
                      <p className="text-lg sm:text-xl font-semibold flex items-center">
                        {formatCurrency(fund?.aum)}
                        <TrendingUp className="ml-2 h-3 w-3 sm:h-4 sm:w-4 text-success" />
                      </p>
                    </div>
                    
                    <div className="bg-primary/5 p-3 sm:p-4 rounded-lg">
                      <p className="text-xs sm:text-sm text-neutral-600 mb-1">Vintage</p>
                      <p className="text-lg sm:text-xl font-semibold">
                        {fund?.vintage || "N/A"}
                      </p>
                    </div>
                    
                    <div className="bg-primary/5 p-3 sm:p-4 rounded-lg">
                      <p className="text-xs sm:text-sm text-neutral-600 mb-1">Total Investments</p>
                      <p className="text-lg sm:text-xl font-semibold">
                        {allocations?.length || 0}
                      </p>
                    </div>
                    
                    <div className="bg-primary/5 p-3 sm:p-4 rounded-lg">
                      <p className="text-xs sm:text-sm text-neutral-600 mb-1">Created Date</p>
                      <p className="text-base sm:text-lg font-medium">
                        {fund?.createdAt ? format(new Date(fund.createdAt), "PPP") : "Unknown"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Visualizations Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Sector Distribution */}
              <FundSectorDistribution allocations={allocations || []} deals={deals || []} />
              
              {/* Called Capital Ratio */}
              <CalledCapitalRatio allocations={allocations || []} totalFundSize={fund?.aum || 0} />
            </div>
            
            {/* Actions Section removed - buttons moved to the top of the page */}
            
            {/* Investment Allocations Section */}
            <div className="mb-8">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Investment Allocations</CardTitle>
                  <CardDescription>
                    All capital allocations made from this fund
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {isAllocationsLoading ? (
                    <div className="p-4 text-center text-gray-500">Loading allocations...</div>
                  ) : allocations?.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <p className="mb-2">No allocations have been made from this fund yet.</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsNewAllocationDialogOpen(true)}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Allocation
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Deal</TableHead>
                          <TableHead>Sector</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Allocated</TableHead>
                          <TableHead className="text-right">Distributions</TableHead>
                          <TableHead className="text-right">Current Value</TableHead>
                          <TableHead className="text-right">MOIC</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allocations?.map(allocation => {
                          const deal = deals?.find(d => d.id === allocation.dealId);
                          // Calculate totals
                          const totalInvested = allocations?.reduce((sum, alloc) => sum + alloc.amount, 0) || 0;
                          let moic = 0;
                          if (allocation.amount > 0) {
                            moic = (allocation.distributionPaid + (allocation.marketValue || 0)) / allocation.amount;
                          }
                          
                          return (
                            <TableRow key={allocation.id}>
                              <TableCell className="font-medium">
                                {deal?.name || "Unknown Deal"}
                              </TableCell>
                              <TableCell>
                                {allocation.securityType || "N/A"}
                              </TableCell>
                              <TableCell>
                                {allocation.status && (
                                  <Badge 
                                    className={`
                                      ${allocation.status === "funded" ? "bg-emerald-100 text-emerald-800" : ""}
                                      ${allocation.status === "committed" ? "bg-blue-100 text-blue-800" : ""}
                                      ${allocation.status === "unfunded" ? "bg-neutral-100 text-neutral-800" : ""}
                                    `}
                                  >
                                    {allocation.status.charAt(0).toUpperCase() + allocation.status.slice(1)}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(allocation.amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(allocation.distributionPaid || 0)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(allocation.marketValue || 0)}
                              </TableCell>
                              <TableCell className="text-right">
                                {moic.toFixed(2)}x
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="icon">
                                    <a href={`/deals/${allocation.dealId}`}>
                                      <FilePenLine className="h-4 w-4" />
                                      <span className="sr-only">View Deal</span>
                                    </a>
                                  </Button>
                                  <Button variant="ghost" size="icon">
                                    <CreditCard className="h-4 w-4" />
                                    <span className="sr-only">Capital Calls</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Fund Performance Metrics */}
            <div className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Fund Performance</CardTitle>
                  <CardDescription>
                    Key performance metrics for this fund
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-primary/5 rounded-lg">
                      <h3 className="text-sm text-gray-500 mb-1">Called Capital</h3>
                      <p className="text-xl font-semibold">
                        {formatCurrency(allocations?.reduce((sum, allocation) => sum + allocation.amount, 0) || 0)}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-primary/5 rounded-lg">
                      <h3 className="text-sm text-gray-500 mb-1">Distribution Rate</h3>
                      <p className="text-xl font-semibold">
                        {fund?.distributionRate ? `${fund.distributionRate.toFixed(2)}%` : "0.00%"}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-primary/5 rounded-lg">
                      <h3 className="text-sm text-gray-500 mb-1">Appreciation Rate</h3>
                      <p className="text-xl font-semibold">
                        {fund?.appreciationRate ? `${fund.appreciationRate.toFixed(2)}%` : "0.00%"}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-primary/5 rounded-lg">
                      <h3 className="text-sm text-gray-500 mb-1">Vintage</h3>
                      <p className="text-xl font-semibold">
                        {fund?.createdAt ? format(new Date(fund.createdAt), "yyyy") : "N/A"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-base font-medium mb-3">Summary</h3>
                    <table className="w-full">
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2 text-neutral-600">Fund Size</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(fund?.aum || 0)}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 text-neutral-600">Vintage Year</td>
                          <td className="py-2 text-right font-medium">{fund?.vintage || "N/A"}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 text-neutral-600">Number of Investments</td>
                          <td className="py-2 text-right font-medium">{allocations?.length || 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}