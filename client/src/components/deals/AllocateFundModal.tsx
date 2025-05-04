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
    capitalCallSchedule: '',
    notes: '',
    // Always committed for new allocations
    status: "committed",
    // These fields are initialized but not shown in the form
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
        capitalCallSchedule: '',
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

  // Fetch the deal to get its sector
  const { data: deal } = useQuery<any>({
    queryKey: [`/api/deals/${dealId}`],
    enabled: !!dealId,
    onSuccess: (data) => {
      // Set the securityType to the deal's sector automatically
      if (data && data.sector && !allocationData.securityType) {
        setAllocationData(prev => ({ 
          ...prev, 
          securityType: data.sector 
        }));
      }
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

    // Use the securityType from the deal sector, but validate it exists
    if (!allocationData.securityType) {
      toast({
        title: "Error",
        description: "Invalid sector information",
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
            <Label htmlFor="amount">Amount Committed *</Label>
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
            <Label htmlFor="allocationDate">Commitment Date *</Label>
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
            <Label htmlFor="capitalCallSchedule">Capital Call Schedule</Label>
            <Select
              onValueChange={(value) => setAllocationData({
                ...allocationData,
                capitalCallSchedule: value
              })}
            >
              <SelectTrigger id="capitalCallSchedule">
                <SelectValue placeholder="Select payment schedule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Payment</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="biannual">Bi-Annual</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="custom">Custom Schedule</SelectItem>
              </SelectContent>
            </Select>
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