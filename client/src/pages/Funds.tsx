import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Fund } from "@/lib/types";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { formatDistanceToNow } from "date-fns";

export default function Funds() {
  const [isNewFundDialogOpen, setIsNewFundDialogOpen] = useState(false);
  const [newFundData, setNewFundData] = useState({
    name: "",
    vintage: new Date().getFullYear(),
    description: ""
  });
  
  const { toast } = useToast();
  
  const { data: funds = [], isLoading } = useQuery<Fund[]>({
    queryKey: ['/api/funds'],
  });

  const handleCreateFund = async () => {
    try {
      if (!newFundData.name) {
        toast({
          title: "Error",
          description: "Fund name is required",
          variant: "destructive"
        });
        return;
      }

      if (!newFundData.vintage || newFundData.vintage < 1980 || newFundData.vintage > new Date().getFullYear() + 1) {
        toast({
          title: "Error",
          description: "Please enter a valid vintage year",
          variant: "destructive"
        });
        return;
      }
      
      await apiRequest("POST", "/api/funds", newFundData);
      
      toast({
        title: "Success",
        description: "Fund created successfully",
      });
      
      // Reset form and close dialog
      setNewFundData({
        name: "",
        vintage: new Date().getFullYear(),
        description: ""
      });
      setIsNewFundDialogOpen(false);
      
      // Invalidate funds query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/funds'] });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create fund",
        variant: "destructive"
      });
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-neutral-800">Funds</h1>
          
          <Dialog open={isNewFundDialogOpen} onOpenChange={setIsNewFundDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-primary hover:bg-primary-dark text-white"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Fund
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Fund</DialogTitle>
                <DialogDescription>
                  Add details for the new investment fund.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Fund Name *</Label>
                  <Input 
                    id="name" 
                    value={newFundData.name}
                    onChange={(e) => setNewFundData({...newFundData, name: e.target.value})}
                    placeholder="e.g. Doliver Fund IV"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    value={newFundData.description}
                    onChange={(e) => setNewFundData({...newFundData, description: e.target.value})}
                    placeholder="Fund description, strategy, etc."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vintage">Vintage Year *</Label>
                  <Input 
                    id="vintage"
                    type="number"
                    value={newFundData.vintage}
                    onChange={(e) => setNewFundData({...newFundData, vintage: parseInt(e.target.value)})}
                    placeholder="e.g. 2025"
                    min={1980}
                    max={new Date().getFullYear() + 1}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewFundDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFund}>
                  Create Fund
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Funds Overview */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {isLoading ? (
            <div className="col-span-full py-8 sm:py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm sm:text-base text-neutral-500">Loading funds...</p>
            </div>
          ) : funds?.length === 0 ? (
            <div className="col-span-full py-8 sm:py-12 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-neutral-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm sm:text-base text-neutral-500">No funds created yet. Create your first fund with the "New Fund" button.</p>
            </div>
          ) : (
            funds?.map(fund => (
              <Card key={fund.id} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
                <CardHeader className="bg-primary/10 pb-2 sm:pb-3">
                  <CardTitle className="text-base sm:text-lg font-semibold truncate">{fund.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-3 sm:pt-4">
                  <div className="flex flex-col mb-3 sm:mb-4 space-y-3">
                    <div>
                      <p className="text-xs sm:text-sm text-neutral-600 mb-0.5">Assets Under Management</p>
                      <p className="text-xl font-semibold flex items-center">
                        {formatCurrency(fund.aum)}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-neutral-600 mb-0.5">Vintage</p>
                        <p className="text-lg font-medium">
                          {fund.vintage || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 mb-0.5">Status</p>
                        <Badge variant="outline" className="font-normal">
                          {fund.vintage && fund.vintage >= new Date().getFullYear() ? "Active" : "Legacy"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {fund.description && (
                    <p className="text-xs sm:text-sm text-neutral-600 mb-3 sm:mb-4 line-clamp-2">{fund.description}</p>
                  )}
                  
                  <div className="text-[10px] sm:text-xs text-neutral-500">
                    Created {formatDistanceToNow(new Date(fund.createdAt), { addSuffix: true })}
                  </div>
                </CardContent>
                <CardFooter className="bg-neutral-50 border-t p-2 sm:p-3">
                  <Button variant="ghost" size="sm" className="ml-auto h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm" asChild>
                    <a href={`/funds/${fund.id}`}>
                      View Details
                      <ArrowUpRight className="ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
        
        {/* Recent Allocations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Recent Fund Allocations</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Deal</TableHead>
                    <TableHead className="text-xs sm:text-sm">Fund</TableHead>
                    <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Security Type</TableHead>
                    <TableHead className="text-xs sm:text-sm">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 sm:py-10 text-neutral-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-neutral-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm">No recent allocations to display.</p>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
