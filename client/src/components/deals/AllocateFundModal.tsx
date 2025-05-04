import React, { useState, useEffect } from 'react';
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
    // Capital call details
    callFrequency: '',
    callPercentage: 0,
    firstCallDate: new Date().toISOString().split('T')[0],
    callCount: 1,
    customSchedule: '', // JSON string for custom payment structure
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
  
  // For managing custom capital call schedule entries
  const [customCalls, setCustomCalls] = useState<Array<{date: string, percentage: number}>>([]);
  const [showCustomFields, setShowCustomFields] = useState(false);

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
        // Reset capital call details
        callFrequency: '',
        callPercentage: 0,
        firstCallDate: new Date().toISOString().split('T')[0],
        callCount: 1,
        customSchedule: '',
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
      
      // Reset custom calls
      setCustomCalls([]);
      setShowCustomFields(false);

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
    enabled: !!dealId
  });
  
  // When deal data is loaded, set securityType
  useEffect(() => {
    if (deal?.sector && !allocationData.securityType) {
      setAllocationData(prev => ({ 
        ...prev, 
        securityType: deal.sector 
      }));
    }
  }, [deal, allocationData.securityType]);
  
  // Show or hide additional fields based on capital call schedule selection
  useEffect(() => {
    if (allocationData.capitalCallSchedule === 'custom') {
      setShowCustomFields(true);
    } else {
      setShowCustomFields(false);
    }
  }, [allocationData.capitalCallSchedule]);

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
    
    // Validate capital call schedule if one is selected
    if (allocationData.capitalCallSchedule) {
      // For regular schedules, validate the percentage
      if (allocationData.capitalCallSchedule !== 'custom' && (!allocationData.callPercentage || allocationData.callPercentage <= 0)) {
        toast({
          title: "Error",
          description: "Please enter a valid payment percentage greater than 0",
          variant: "destructive"
        });
        return;
      }
      
      // For custom schedule, validate entries
      if (allocationData.capitalCallSchedule === 'custom') {
        if (customCalls.length === 0) {
          toast({
            title: "Error",
            description: "Please add at least one payment to your custom schedule",
            variant: "destructive"
          });
          return;
        }
        
        const totalPercentage = customCalls.reduce((sum, call) => sum + (call.percentage || 0), 0);
        if (totalPercentage <= 0) {
          toast({
            title: "Error",
            description: "Total percentage must be greater than 0",
            variant: "destructive"
          });
          return;
        }
        
        // Check if any dates are missing
        const invalidDates = customCalls.some(call => !call.date);
        if (invalidDates) {
          toast({
            title: "Error",
            description: "All payment dates must be set",
            variant: "destructive"
          });
          return;
        }
      }
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

          {/* Conditional fields based on capital call schedule */}
          {allocationData.capitalCallSchedule && allocationData.capitalCallSchedule !== 'custom' && (
            <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-sm">Capital Call Details</h4>
              
              {/* Percentage field for all non-custom schedules */}
              <div className="space-y-2">
                <Label htmlFor="callPercentage">
                  {allocationData.capitalCallSchedule === 'single' ? 'Payment Percentage' : 
                    `${allocationData.capitalCallSchedule.charAt(0).toUpperCase() + allocationData.capitalCallSchedule.slice(1)} Payment Percentage`}
                </Label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-3 flex items-center text-neutral-500">
                    %
                  </span>
                  <Input
                    id="callPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    className="pr-8"
                    value={allocationData.callPercentage || ''}
                    onChange={(e) => setAllocationData({
                      ...allocationData,
                      callPercentage: parseFloat(e.target.value)
                    })}
                    placeholder="0"
                  />
                </div>
              </div>
              
              {/* First call date */}
              <div className="space-y-2">
                <Label htmlFor="firstCallDate">First Call Date</Label>
                <Input
                  id="firstCallDate"
                  type="date"
                  value={allocationData.firstCallDate}
                  onChange={(e) => setAllocationData({
                    ...allocationData,
                    firstCallDate: e.target.value
                  })}
                />
              </div>
              
              {/* Number of calls (not applicable for single payment) */}
              {allocationData.capitalCallSchedule !== 'single' && (
                <div className="space-y-2">
                  <Label htmlFor="callCount">Number of Payments</Label>
                  <Input
                    id="callCount"
                    type="number"
                    min="1"
                    max="36"
                    step="1"
                    value={allocationData.callCount}
                    onChange={(e) => setAllocationData({
                      ...allocationData,
                      callCount: parseInt(e.target.value)
                    })}
                    placeholder="1"
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Custom schedule fields */}
          {showCustomFields && (
            <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Custom Payment Schedule</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Add a new custom call entry
                    const newCustomCalls = [...customCalls, {
                      date: new Date().toISOString().split('T')[0],
                      percentage: 0
                    }];
                    setCustomCalls(newCustomCalls);
                    
                    // Update the allocation data with JSON string of custom calls
                    setAllocationData({
                      ...allocationData,
                      customSchedule: JSON.stringify(newCustomCalls)
                    });
                  }}
                >
                  Add Payment
                </Button>
              </div>
              
              {customCalls.length === 0 ? (
                <div className="text-sm text-gray-500 italic">
                  No custom payments added. Click "Add Payment" to begin creating your schedule.
                </div>
              ) : (
                <div className="space-y-3">
                  {customCalls.map((call, index) => (
                    <div key={index} className="flex space-x-2 items-end">
                      <div className="flex-1">
                        <Label htmlFor={`callDate-${index}`} className="text-xs">Date</Label>
                        <Input
                          id={`callDate-${index}`}
                          type="date"
                          value={call.date}
                          onChange={(e) => {
                            const updatedCalls = [...customCalls];
                            updatedCalls[index].date = e.target.value;
                            setCustomCalls(updatedCalls);
                            setAllocationData({
                              ...allocationData,
                              customSchedule: JSON.stringify(updatedCalls)
                            });
                          }}
                        />
                      </div>
                      <div className="w-24">
                        <Label htmlFor={`callPercentage-${index}`} className="text-xs">Percentage</Label>
                        <div className="relative">
                          <span className="absolute inset-y-0 right-3 flex items-center text-neutral-500">
                            %
                          </span>
                          <Input
                            id={`callPercentage-${index}`}
                            type="number"
                            min="0"
                            max="100"
                            className="pr-8"
                            value={call.percentage}
                            onChange={(e) => {
                              const updatedCalls = [...customCalls];
                              updatedCalls[index].percentage = parseFloat(e.target.value);
                              setCustomCalls(updatedCalls);
                              setAllocationData({
                                ...allocationData,
                                customSchedule: JSON.stringify(updatedCalls)
                              });
                            }}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => {
                          const updatedCalls = customCalls.filter((_, i) => i !== index);
                          setCustomCalls(updatedCalls);
                          setAllocationData({
                            ...allocationData,
                            customSchedule: JSON.stringify(updatedCalls)
                          });
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex justify-between items-center text-sm font-medium pt-2">
                    <span>Total:</span>
                    <span>
                      {customCalls.reduce((sum, call) => sum + (call.percentage || 0), 0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

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