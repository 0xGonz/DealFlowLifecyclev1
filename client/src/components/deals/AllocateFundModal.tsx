import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface AllocateFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: number;
  dealName: string;
}

export default function AllocateFundModal({ isOpen, onClose, dealId, dealName }: AllocateFundModalProps) {
  const { toast } = useToast();

  // State for the allocation form
  const [allocationData, setAllocationData] = useState({
    fundId: null as number | null,
    dealId: dealId,
    amount: 0,
    securityType: '',
    allocationDate: new Date().toISOString().split('T')[0], // format as YYYY-MM-DD
    notes: '',
    // Investment tracking fields
    status: "committed", // committed, funded, unfunded
    portfolioWeight: 0,
    interestPaid: 0,
    distributionPaid: 0,
    marketValue: 0,
    moic: 1,
    irr: 0
  });

  // Fetch funds for dropdown
  const { data: funds = [], isLoading: isFundsLoading } = useQuery<any[]>({
    queryKey: ['/api/funds'],
  });

  // Create allocation mutation
  const createAllocation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/allocations", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Investment allocated successfully"
      });

      // Reset form and close dialog
      setAllocationData({
        fundId: null,
        dealId: dealId,
        amount: 0,
        securityType: '',
        allocationDate: new Date().toISOString().split('T')[0],
        notes: '',
        // Reset investment tracking fields
        status: "committed",
        portfolioWeight: 0,
        interestPaid: 0,
        distributionPaid: 0,
        marketValue: 0,
        moic: 1,
        irr: 0
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/allocations/deal/${dealId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
      
      // Close modal
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to allocate investment",
        variant: "destructive"
      });
    }
  });

  const handleCreateAllocation = () => {
    if (!allocationData.fundId) {
      toast({
        title: "Error",
        description: "Please select a fund",
        variant: "destructive"
      });
      return;
    }

    if (!allocationData.amount || allocationData.amount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    if (!allocationData.securityType) {
      toast({
        title: "Error",
        description: "Security type is required",
        variant: "destructive"
      });
      return;
    }

    createAllocation.mutate(allocationData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Allocate Investment</DialogTitle>
          <DialogDescription>
            Record an investment allocation for {dealName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fund">Fund *</Label>
            <Select
              onValueChange={(value) => setAllocationData({
                ...allocationData,
                fundId: parseInt(value)
              })}
            >
              <SelectTrigger id="fund">
                <SelectValue placeholder="Select a fund" />
              </SelectTrigger>
              <SelectContent>
                {isFundsLoading ? (
                  <SelectItem value="loading" disabled>Loading funds...</SelectItem>
                ) : (
                  funds?.map((fund: any) => (
                    <SelectItem key={fund.id} value={fund.id.toString()}>
                      {fund.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500">
                $
              </span>
              <Input
                id="amount"
                type="number"
                min="0"
                step="1000"
                className="pl-6"
                value={allocationData.amount || ''}
                onChange={(e) => setAllocationData({
                  ...allocationData,
                  amount: parseFloat(e.target.value)
                })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="securityType">Security Type *</Label>
            <Select
              onValueChange={(value) => setAllocationData({
                ...allocationData,
                securityType: value
              })}
            >
              <SelectTrigger id="securityType">
                <SelectValue placeholder="Select security type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="common">Common Stock</SelectItem>
                <SelectItem value="preferred">Preferred Stock</SelectItem>
                <SelectItem value="convertible">Convertible Note</SelectItem>
                <SelectItem value="safe">SAFE</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allocationDate">Investment Date *</Label>
            <Input
              id="allocationDate"
              type="date"
              value={allocationData.allocationDate}
              onChange={(e) => setAllocationData({
                ...allocationData,
                allocationDate: e.target.value
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Investment Status *</Label>
            <Select 
              onValueChange={(value) => setAllocationData({
                ...allocationData, 
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distributionPaid">Distributions Paid</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500">
                  $
                </span>
                <Input 
                  id="distributionPaid"
                  type="number"
                  className="pl-6"
                  value={allocationData.distributionPaid}
                  onChange={(e) => setAllocationData({
                    ...allocationData, 
                    distributionPaid: parseFloat(e.target.value)
                  })}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="marketValue">Current Market Value</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500">
                  $
                </span>
                <Input 
                  id="marketValue"
                  type="number"
                  className="pl-6"
                  value={allocationData.marketValue}
                  onChange={(e) => setAllocationData({
                    ...allocationData, 
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
              value={allocationData.notes}
              onChange={(e) => setAllocationData({
                ...allocationData,
                notes: e.target.value
              })}
              placeholder="Any additional details about this investment"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateAllocation}
            disabled={createAllocation.isPending}
          >
            {createAllocation.isPending ? "Allocating..." : "Allocate Investment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}