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
    notes: ""
  });
  
  const { toast } = useToast();
  
  // Fetch fund details
  const { data: fund, isLoading: isFundLoading, isError: isFundError } = useQuery({
    queryKey: ['/api/funds', fundId],
    enabled: !!fundId,
  });
  
  // Fetch allocations for this fund
  const { data: allocations, isLoading: isAllocationsLoading } = useQuery({
    queryKey: ['/api/funds', fundId, 'allocations'],
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
        notes: ""
      });
      setIsNewAllocationDialogOpen(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/funds', fundId, 'allocations'] });
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
        description: "Security type is required",
        variant: "destructive"
      });
      return;
    }
    
    createAllocation.mutate(newAllocationData);
  };
  
  // Handle 404
  if (isFundError || (fund === null && !isFundLoading)) {
    return <NotFound />;
  }
  
  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        <div className="flex items-center mb-6">
          <Button variant="ghost" className="mr-3 p-2" asChild>
            <a href="/funds">
              <ChevronLeft className="h-5 w-5" />
            </a>
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-800">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-neutral-600 mb-1">Assets Under Management</p>
                      <p className="text-2xl font-semibold flex items-center">
                        {formatCurrency(fund?.aum)}
                        <TrendingUp className="ml-2 h-4 w-4 text-success" />
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-neutral-600 mb-1">Total Investments</p>
                      <p className="text-2xl font-semibold">
                        {allocations?.length || 0}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-neutral-600 mb-1">Created Date</p>
                      <p className="text-lg font-medium">
                        {fund?.createdAt ? format(new Date(fund.createdAt), "PPP") : "Unknown"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
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
                          <Label htmlFor="amount">Amount *</Label>
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
                          <Label htmlFor="securityType">Security Type *</Label>
                          <Select 
                            onValueChange={(value) => setNewAllocationData({
                              ...newAllocationData, 
                              securityType: value
                            })}
                          >
                            <SelectTrigger id="securityType">
                              <SelectValue placeholder="Select security type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="common">Common Stock</SelectItem>
                              <SelectItem value="preferred">Preferred Stock</SelectItem>
                              <SelectItem value="safe">SAFE</SelectItem>
                              <SelectItem value="convertible">Convertible Note</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
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
                        <DialogClose asChild>
                          <Button variant="outline">
                            Cancel
                          </Button>
                        </DialogClose>
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
                          <div className="grid grid-cols-2 gap-4">
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
                        <DialogClose asChild>
                          <Button variant="outline">
                            Cancel
                          </Button>
                        </DialogClose>
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
            
            {/* Fund Allocations */}
            <Card>
              <CardHeader>
                <CardTitle>Investment Allocations</CardTitle>
                <CardDescription>
                  All capital allocations made from this fund
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Security Type</TableHead>
                      <TableHead>Allocation Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isAllocationsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10">
                          Loading allocations...
                        </TableCell>
                      </TableRow>
                    ) : allocations?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-neutral-500">
                          No allocations have been made from this fund yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      allocations?.map(allocation => {
                        const deal = deals?.find(d => d.id === allocation.dealId);
                        
                        return (
                          <TableRow key={allocation.id}>
                            <TableCell className="font-medium">
                              <a href={`/deals/${allocation.dealId}`} className="text-primary hover:underline">
                                {deal?.name || `Deal #${allocation.dealId}`}
                              </a>
                            </TableCell>
                            <TableCell>
                              {deal?.stageLabel ? (
                                <Badge 
                                  variant="outline" 
                                  className={
                                    deal.stage === "closed" ? "border-success text-success" :
                                    deal.stage === "passed" ? "border-destructive text-destructive" :
                                    "border-primary text-primary"
                                  }
                                >
                                  {deal.stageLabel}
                                </Badge>
                              ) : "-"}
                            </TableCell>
                            <TableCell>{formatCurrency(allocation.amount)}</TableCell>
                            <TableCell>
                              {allocation.securityType === "common" && "Common Stock"}
                              {allocation.securityType === "preferred" && "Preferred Stock"}
                              {allocation.securityType === "safe" && "SAFE"}
                              {allocation.securityType === "convertible" && "Convertible Note"}
                              {allocation.securityType === "other" && "Other"}
                            </TableCell>
                            <TableCell>
                              {allocation.allocationDate ? 
                                new Date(allocation.allocationDate).toString() !== "Invalid Date" 
                                  ? format(new Date(allocation.allocationDate), "PP") 
                                  : "-" 
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <a href={`/deals/${allocation.dealId}`}>
                                  View Deal
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">TVPI</h3>
                    <p className="text-2xl font-semibold">1.23x</p>
                    <p className="text-sm text-neutral-500">Total Value to Paid-In Capital</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">DPI</h3>
                    <p className="text-2xl font-semibold">0.35x</p>
                    <p className="text-sm text-neutral-500">Distributions to Paid-In Capital</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">RVPI</h3>
                    <p className="text-2xl font-semibold">0.88x</p>
                    <p className="text-sm text-neutral-500">Residual Value to Paid-In Capital</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-1">IRR</h3>
                    <p className="text-2xl font-semibold">14.2%</p>
                    <p className="text-sm text-neutral-500">Internal Rate of Return</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}