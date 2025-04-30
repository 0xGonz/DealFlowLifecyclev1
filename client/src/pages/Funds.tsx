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
import { Plus, DollarSign, TrendingUp, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { formatDistanceToNow } from "date-fns";

export default function Funds() {
  const [isNewFundDialogOpen, setIsNewFundDialogOpen] = useState(false);
  const [newFundData, setNewFundData] = useState({
    name: "",
    description: "",
    aum: 0
  });
  
  const { toast } = useToast();
  
  const { data: funds, isLoading } = useQuery({
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
      
      await apiRequest("POST", "/api/funds", newFundData);
      
      toast({
        title: "Success",
        description: "Fund created successfully",
      });
      
      // Reset form and close dialog
      setNewFundData({
        name: "",
        description: "",
        aum: 0
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
                  <Label htmlFor="aum">Initial AUM</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <Input 
                      id="aum"
                      type="number"
                      className="pl-10"
                      value={newFundData.aum}
                      onChange={(e) => setNewFundData({...newFundData, aum: parseFloat(e.target.value)})}
                      placeholder="0.00"
                    />
                  </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-neutral-500">
              Loading funds...
            </div>
          ) : funds?.length === 0 ? (
            <div className="col-span-full py-12 text-center text-neutral-500">
              No funds created yet. Create your first fund with the "New Fund" button.
            </div>
          ) : (
            funds?.map(fund => (
              <Card key={fund.id} className="overflow-hidden">
                <CardHeader className="bg-primary/10 pb-2">
                  <CardTitle className="text-lg">{fund.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="mb-4">
                    <p className="text-sm text-neutral-600 mb-1">Assets Under Management</p>
                    <p className="text-2xl font-semibold flex items-center">
                      {formatCurrency(fund.aum)}
                      <TrendingUp className="ml-2 h-4 w-4 text-success" />
                    </p>
                  </div>
                  
                  {fund.description && (
                    <p className="text-sm text-neutral-600 mb-4">{fund.description}</p>
                  )}
                  
                  <div className="text-xs text-neutral-500">
                    Created {formatDistanceToNow(new Date(fund.createdAt), { addSuffix: true })}
                  </div>
                </CardContent>
                <CardFooter className="bg-neutral-50 border-t">
                  <Button variant="ghost" size="sm" className="ml-auto" asChild>
                    <a href={`/funds/${fund.id}`}>
                      View Details
                      <ArrowUpRight className="ml-1 h-4 w-4" />
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
            <CardTitle>Recent Fund Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Security Type</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* In a real app, we'd fetch allocations across all funds */}
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-neutral-500">
                    No recent allocations to display.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
