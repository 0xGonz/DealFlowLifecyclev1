import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { formatPercentage } from '@/lib/utils/format';
import { formatDateForAPI } from '@/lib/dateUtils';
import { FINANCIAL_CALCULATION } from '@/lib/constants/calculation-constants';
import { ALLOCATION_STATUS, CAPITAL_CALL_SCHEDULES, PAYMENT_SCHEDULE_LABELS } from '@/lib/constants/allocation-constants';

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

// Define the allocation data interface
interface AllocationFormData {
  fundId: number | null;
  dealId: number;
  amount: number;
  securityType: string;
  allocationDate: Date;
  capitalCallSchedule: string;
  callFrequency: string;
  callPercentage: number;
  callAmountType: 'percentage' | 'dollar';
  callDollarAmount: number;
  firstCallDate: Date;
  callCount: number;
  customSchedule: string;
  notes: string;
  status: string;
  portfolioWeight: number;
  interestPaid: number;
  distributionPaid: number;
  marketValue: number;
  moic: number;
  irr: number;
}

export default function AllocateFundModal({ isOpen, onClose, dealId, dealName }: AllocateFundModalProps) {
  const { toast } = useToast();

  // State for the allocation form
  const [allocationData, setAllocationData] = useState<AllocationFormData>({
    fundId: null as number | null,
    dealId: dealId,
    amount: 0,
    securityType: '',
    allocationDate: new Date(),
    capitalCallSchedule: '',
    callFrequency: '',
    callPercentage: 0,
    callAmountType: 'percentage',
    callDollarAmount: 0,
    firstCallDate: new Date(),
    callCount: 1,
    customSchedule: '',
    notes: '',
    status: ALLOCATION_STATUS.COMMITTED,
    portfolioWeight: 0,
    interestPaid: 0,
    distributionPaid: 0,
    marketValue: 0,
    moic: 1,
    irr: 0
  });
  
  // For managing custom capital call schedule entries
  const [customCalls, setCustomCalls] = useState<Array<{date: string, percentage: number, amountType: string}>>([]);
  const [showCustomFields, setShowCustomFields] = useState(false);

  // Fetch funds for dropdown
  const { data: funds = [], isLoading: isFundsLoading } = useQuery<any[]>({
    queryKey: ['/api/funds'],
  });

  // Helper function to create capital calls for an allocation
  const createCapitalCallsForAllocation = async (allocationId: number, data: AllocationFormData) => {
    try {
      if (data.capitalCallSchedule === 'custom' && customCalls.length > 0) {
        // Create custom capital calls
        for (const call of customCalls) {
          const capitalCallPayload = {
            allocationId: allocationId,
            callAmount: data.callAmountType === 'percentage' 
              ? (call.percentage / 100) * data.amount 
              : data.callDollarAmount,
            amountType: data.callAmountType,
            callDate: formatDateForAPI(new Date(call.date)),
            dueDate: formatDateForAPI(new Date(call.date)),
            status: 'scheduled',
            notes: `Auto-generated from custom schedule`
          };
          
          await apiRequest('POST', '/api/capital-calls', capitalCallPayload);
        }
      } else if (data.capitalCallSchedule !== 'none') {
        // Create standard capital calls based on schedule
        const callAmount = data.callAmountType === 'percentage' 
          ? (data.callPercentage / 100) * data.amount 
          : data.callDollarAmount;
        
        for (let i = 0; i < data.callCount; i++) {
          const callDate = new Date(data.firstCallDate);
          
          // Adjust date based on frequency
          if (data.callFrequency === 'monthly') {
            callDate.setMonth(callDate.getMonth() + i);
          } else if (data.callFrequency === 'quarterly') {
            callDate.setMonth(callDate.getMonth() + (i * 3));
          } else if (data.callFrequency === 'annually') {
            callDate.setFullYear(callDate.getFullYear() + i);
          }
          
          const capitalCallPayload = {
            allocationId: allocationId,
            callAmount: callAmount,
            amountType: data.callAmountType,
            callDate: formatDateForAPI(callDate),
            dueDate: formatDateForAPI(new Date(callDate.getTime() + (30 * 24 * 60 * 60 * 1000))), // 30 days after call date
            status: 'scheduled',
            notes: `Auto-generated capital call ${i + 1} of ${data.callCount}`
          };
          
          await apiRequest('POST', '/api/capital-calls', capitalCallPayload);
        }
      }
    } catch (error) {
      console.error('Failed to create capital calls:', error);
      throw error;
    }
  };

  // Create allocation mutation
  const createAllocation = useMutation({
    mutationFn: async (data: AllocationFormData) => {
      // Prepare allocation data for API
      const allocationPayload = {
        fundId: data.fundId,
        dealId: data.dealId,
        amount: data.amount,
        securityType: data.securityType,
        allocationDate: formatDateForAPI(data.allocationDate),
        status: data.status,
        notes: data.notes,
        portfolioWeight: data.portfolioWeight,
        interestPaid: data.interestPaid,
        distributionPaid: data.distributionPaid,
        marketValue: data.marketValue,
        moic: data.moic,
        irr: data.irr
      };

      console.log('Creating allocation with data:', allocationPayload);
      
      const response = await apiRequest('POST', '/api/allocations', allocationPayload);
      const allocation = await response.json();
      
      // If capital call schedule is specified, create capital calls
      if (data.capitalCallSchedule && data.capitalCallSchedule !== 'none') {
        await createCapitalCallsForAllocation(allocation.id, data);
      }
      
      return allocation;
    },
    onSuccess: () => {
      toast({
        title: "Allocation created successfully",
        description: `Fund allocation for ${dealName} has been created.`,
      });
      
      // Reset form and close modal
      setAllocationData({
        fundId: null,
        dealId: dealId,
        amount: 0,
        securityType: '',
        allocationDate: new Date(),
        capitalCallSchedule: '',
        callFrequency: '',
        callPercentage: 0,
        callAmountType: 'percentage',
        callDollarAmount: 0,
        firstCallDate: new Date(),
        callCount: 1,
        customSchedule: '',
        notes: '',
        status: ALLOCATION_STATUS.COMMITTED,
        portfolioWeight: 0,
        interestPaid: 0,
        distributionPaid: 0,
        marketValue: 0,
        moic: 1,
        irr: 0
      });
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/allocations/deal/${dealId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/funds'] });
      
      onClose();
    },
    onError: (error: any) => {
      console.error('Allocation creation failed:', error);
      toast({
        title: "Failed to create allocation",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!allocationData.fundId) {
      toast({
        title: "Validation Error",
        description: "Please select a fund.",
        variant: "destructive",
      });
      return;
    }
    
    if (!allocationData.amount || allocationData.amount <= 0) {
      toast({
        title: "Validation Error", 
        description: "Please enter a valid allocation amount.",
        variant: "destructive",
      });
      return;
    }
    
    if (!allocationData.securityType) {
      toast({
        title: "Validation Error",
        description: "Please enter a security type.",
        variant: "destructive",
      });
      return;
    }
    
    // Submit the allocation
    createAllocation.mutate(allocationData);
  };

  // Handle capital call schedule changes
  const handleCapitalCallScheduleChange = (value: string) => {
    setAllocationData(prev => ({ ...prev, capitalCallSchedule: value }));
    
    if (value === 'custom') {
      setShowCustomFields(true);
    } else {
      setShowCustomFields(false);
    }
    
    if (value === 'none') {
      // Reset capital call related fields
      setAllocationData(prev => ({
        ...prev,
        callFrequency: '',
        callPercentage: 0,
        callDollarAmount: 0,
        callCount: 1
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Allocate Fund to Deal</DialogTitle>
          <DialogDescription>
            Allocate capital from a fund to {dealName}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Allocation Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fund">Fund</Label>
              <Select
                value={allocationData.fundId?.toString() || ''}
                onValueChange={(value) => setAllocationData(prev => ({ ...prev, fundId: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a fund" />
                </SelectTrigger>
                <SelectContent>
                  {funds.map(fund => (
                    <SelectItem key={fund.id} value={fund.id.toString()}>
                      {fund.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Allocation Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={allocationData.amount || ''}
                onChange={(e) => setAllocationData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="securityType">Security Type</Label>
              <Input
                id="securityType"
                value={allocationData.securityType}
                onChange={(e) => setAllocationData(prev => ({ ...prev, securityType: e.target.value }))}
                placeholder="e.g., Preferred Stock, Common Stock, Convertible Note"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="allocationDate">Allocation Date</Label>
              <Input
                id="allocationDate"
                type="date"
                value={format(allocationData.allocationDate, 'yyyy-MM-dd')}
                onChange={(e) => setAllocationData(prev => ({ ...prev, allocationDate: new Date(e.target.value) }))}
              />
            </div>
          </div>

          {/* Capital Call Schedule */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="capitalCallSchedule">Capital Call Schedule</Label>
              <Select
                value={allocationData.capitalCallSchedule}
                onValueChange={handleCapitalCallScheduleChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select capital call schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Capital Calls</SelectItem>
                  <SelectItem value="standard">Standard Schedule</SelectItem>
                  <SelectItem value="custom">Custom Schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Standard Capital Call Fields */}
            {allocationData.capitalCallSchedule === 'standard' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="callFrequency">Call Frequency</Label>
                  <Select
                    value={allocationData.callFrequency}
                    onValueChange={(value) => setAllocationData(prev => ({ ...prev, callFrequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="callAmountType">Call Amount Type</Label>
                  <Select
                    value={allocationData.callAmountType}
                    onValueChange={(value) => setAllocationData(prev => ({ ...prev, callAmountType: value as 'percentage' | 'dollar' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="dollar">Dollar Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {allocationData.callAmountType === 'percentage' && (
                  <div className="space-y-2">
                    <Label htmlFor="callPercentage">Call Percentage (%)</Label>
                    <Input
                      id="callPercentage"
                      type="number"
                      step="0.01"
                      value={allocationData.callPercentage || ''}
                      onChange={(e) => setAllocationData(prev => ({ ...prev, callPercentage: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>
                )}
                
                {allocationData.callAmountType === 'dollar' && (
                  <div className="space-y-2">
                    <Label htmlFor="callDollarAmount">Call Amount ($)</Label>
                    <Input
                      id="callDollarAmount"
                      type="number"
                      step="0.01"
                      value={allocationData.callDollarAmount || ''}
                      onChange={(e) => setAllocationData(prev => ({ ...prev, callDollarAmount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="firstCallDate">First Call Date</Label>
                  <Input
                    id="firstCallDate"
                    type="date"
                    value={format(allocationData.firstCallDate, 'yyyy-MM-dd')}
                    onChange={(e) => setAllocationData(prev => ({ ...prev, firstCallDate: new Date(e.target.value) }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="callCount">Number of Calls</Label>
                  <Input
                    id="callCount"
                    type="number"
                    min="1"
                    value={allocationData.callCount}
                    onChange={(e) => setAllocationData(prev => ({ ...prev, callCount: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={allocationData.notes}
              onChange={(e) => setAllocationData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this allocation..."
              rows={3}
            />
          </div>
        </form>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createAllocation.isPending}
          >
            {createAllocation.isPending ? 'Creating...' : 'Create Allocation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}