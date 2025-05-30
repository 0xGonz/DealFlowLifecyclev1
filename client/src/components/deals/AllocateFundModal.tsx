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
  amountType: 'dollar' | 'percentage';
  securityType: string;
  allocationDate: Date;
  capitalCallSchedule: string;
  callFrequency: string;
  callPercentage: number;
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
    amountType: 'dollar' as 'dollar' | 'percentage', // Add amountType field with default value
    securityType: '',
    allocationDate: new Date(), // Use actual Date object instead of string
    capitalCallSchedule: '',
    // Capital call details
    callFrequency: '',
    callPercentage: 0,
    firstCallDate: new Date(), // Use actual Date object instead of string
    callCount: 1,
    customSchedule: '', // JSON string for custom payment structure
    notes: '',
    // Always committed for new allocations
    status: ALLOCATION_STATUS.COMMITTED,
    // These fields are initialized but not shown in the form
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

  // Create allocation mutation
  const createAllocation = useMutation({
    mutationFn: async (data: AllocationFormData) => {
      // Use the formatDateForAPI utility for consistent date handling
      const formattedData = {
        ...data,
        // Convert Date objects to strings with noon UTC
        allocationDate: formatDateForAPI(data.allocationDate),
        firstCallDate: formatDateForAPI(data.firstCallDate)
      };
      
      try {
        const response = await apiRequest("POST", "/api/allocations", formattedData);
        
        // Check if response is not ok and handle the error
        if (!response.ok) {
          // Clone the response before reading its body
          const errorClone = response.clone();
          let errorMessage = 'Failed to allocate investment';
          
          try {
            const errorData = await errorClone.json();
            errorMessage = errorData.message || errorMessage;
            if (errorData.errors && errorData.errors.length > 0) {
              // Add specific validation error details
              errorMessage += `: ${errorData.errors[0].message}`;
            }
          } catch (e) {
            console.error('Error parsing error response:', e);
          }
          
          throw new Error(errorMessage);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Exception in mutation function:', error);
        throw error;
      }
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
        amountType: 'dollar',
        securityType: '',
        allocationDate: new Date(),
        capitalCallSchedule: '',
        // Reset capital call details
        callFrequency: '',
        callPercentage: 0,
        firstCallDate: new Date(),
        callCount: 1,
        customSchedule: '',
        notes: '',
        // Reset investment tracking fields
        status: ALLOCATION_STATUS.COMMITTED,
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
      queryClient.invalidateQueries({ queryKey: ['/api/allocations'] }); // Invalidate all allocations for funds page
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
      
      // If there's a fundId, invalidate that fund's data too
      if (allocationData.fundId) {
        queryClient.invalidateQueries({ queryKey: [`/api/funds/${allocationData.fundId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/allocations/fund/${allocationData.fundId}`] });
      }
      
      // Invalidate funds query to refresh the AUM calculations
      queryClient.invalidateQueries({ queryKey: ['/api/funds'] });
      
      // Close modal
      onClose();
    },
    onError: (error) => {
      console.error('Allocation error:', error);
      toast({
        title: "Error",
        description: `Failed to allocate investment: ${error.message || 'Unknown error'}`,
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
    if (allocationData.capitalCallSchedule === CAPITAL_CALL_SCHEDULES.CUSTOM) {
      setShowCustomFields(true);
    } else {
      setShowCustomFields(false);
    }
  }, [allocationData.capitalCallSchedule]);
  
  // Update defaults based on capital call schedule
  useEffect(() => {
    if (allocationData.capitalCallSchedule === CAPITAL_CALL_SCHEDULES.SINGLE) {
      // For single payments, set 100% and update status to 'funded'
      setAllocationData(prev => ({
        ...prev,
        callPercentage: 100,
        callCount: 1,
        status: ALLOCATION_STATUS.FUNDED // Single payments are automatically marked as funded
      }));
    } else if (allocationData.capitalCallSchedule === CAPITAL_CALL_SCHEDULES.QUARTERLY) {
      setAllocationData(prev => ({
        ...prev,
        callPercentage: 25, // 25% per quarter
        callCount: 4,
        status: ALLOCATION_STATUS.COMMITTED
      }));
    } else if (allocationData.capitalCallSchedule === CAPITAL_CALL_SCHEDULES.MONTHLY) {
      setAllocationData(prev => ({
        ...prev,
        callPercentage: 8.33, // ~8.33% per month
        callCount: 12,
        status: ALLOCATION_STATUS.COMMITTED
      }));
    } else if (allocationData.capitalCallSchedule === CAPITAL_CALL_SCHEDULES.BIANNUAL) {
      setAllocationData(prev => ({
        ...prev,
        callPercentage: 50, // 50% twice a year
        callCount: 2,
        status: ALLOCATION_STATUS.COMMITTED
      }));
    } else if (allocationData.capitalCallSchedule === CAPITAL_CALL_SCHEDULES.ANNUAL) {
      setAllocationData(prev => ({
        ...prev,
        callPercentage: 100, // 100% once a year
        callCount: 1,
        status: ALLOCATION_STATUS.COMMITTED
      }));
    }
  }, [allocationData.capitalCallSchedule]);

  const handleCreateAllocation = () => {
    // Log the allocation data for debugging
    
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
      if (allocationData.capitalCallSchedule !== CAPITAL_CALL_SCHEDULES.CUSTOM && (!allocationData.callPercentage || allocationData.callPercentage <= 0)) {
        toast({
          title: "Error",
          description: "Please enter a valid payment percentage greater than 0",
          variant: "destructive"
        });
        return;
      }
      
      // For custom schedule, validate entries
      if (allocationData.capitalCallSchedule === CAPITAL_CALL_SCHEDULES.CUSTOM) {
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
            <div className="flex justify-between">
              <Label htmlFor="amount">Amount Committed *</Label>
              <div className="flex items-center space-x-2">
                <Label htmlFor="amountType" className="text-xs">Type:</Label>
                <Select
                  value={allocationData.amountType}
                  onValueChange={(value) => setAllocationData({
                    ...allocationData,
                    amountType: value as 'dollar' | 'percentage'
                  })}
                >
                  <SelectTrigger id="amountType" className="h-7 w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dollar">Dollar</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500">
                {allocationData.amountType === 'dollar' ? '$' : ''}
              </span>
              <Input
                id="amount"
                type="number"
                min="0"
                step={allocationData.amountType === 'dollar' ? '1000' : '1'}
                className="pl-6"
                value={allocationData.amount || ''}
                onChange={(e) => setAllocationData({
                  ...allocationData,
                  amount: parseFloat(e.target.value)
                })}
                placeholder="0.00"
              />
              {allocationData.amountType === 'percentage' && (
                <span className="absolute inset-y-0 right-3 flex items-center text-neutral-500">
                  %
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allocationDate">Commitment Date *</Label>
            <Input
              id="allocationDate"
              type="date"
              value={allocationData.allocationDate instanceof Date 
                ? allocationData.allocationDate.toISOString().split('T')[0] 
                : ''}
              onChange={(e) => setAllocationData({
                ...allocationData,
                allocationDate: e.target.value ? new Date(e.target.value) : new Date()
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
                <SelectItem value={CAPITAL_CALL_SCHEDULES.SINGLE}>{PAYMENT_SCHEDULE_LABELS[CAPITAL_CALL_SCHEDULES.SINGLE]}</SelectItem>
                <SelectItem value={CAPITAL_CALL_SCHEDULES.QUARTERLY}>{PAYMENT_SCHEDULE_LABELS[CAPITAL_CALL_SCHEDULES.QUARTERLY]}</SelectItem>
                <SelectItem value={CAPITAL_CALL_SCHEDULES.MONTHLY}>{PAYMENT_SCHEDULE_LABELS[CAPITAL_CALL_SCHEDULES.MONTHLY]}</SelectItem>
                <SelectItem value={CAPITAL_CALL_SCHEDULES.BIANNUAL}>{PAYMENT_SCHEDULE_LABELS[CAPITAL_CALL_SCHEDULES.BIANNUAL]}</SelectItem>
                <SelectItem value={CAPITAL_CALL_SCHEDULES.ANNUAL}>{PAYMENT_SCHEDULE_LABELS[CAPITAL_CALL_SCHEDULES.ANNUAL]}</SelectItem>
                <SelectItem value={CAPITAL_CALL_SCHEDULES.CUSTOM}>{PAYMENT_SCHEDULE_LABELS[CAPITAL_CALL_SCHEDULES.CUSTOM]}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional fields based on capital call schedule */}
          {allocationData.capitalCallSchedule && allocationData.capitalCallSchedule !== CAPITAL_CALL_SCHEDULES.CUSTOM && (
            <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-sm">Capital Call Details</h4>
              
              {/* Percentage field for all non-custom schedules */}
              <div className="space-y-2">
                <Label htmlFor="callPercentage">
                  {PAYMENT_SCHEDULE_LABELS[allocationData.capitalCallSchedule as keyof typeof PAYMENT_SCHEDULE_LABELS]} Payment Percentage
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
                  value={allocationData.firstCallDate instanceof Date 
                    ? allocationData.firstCallDate.toISOString().split('T')[0] 
                    : ''}
                  onChange={(e) => setAllocationData({
                    ...allocationData,
                    firstCallDate: e.target.value ? new Date(e.target.value) : new Date()
                  })}
                />
              </div>
              
              {/* Number of calls (not applicable for single payment) */}
              {allocationData.capitalCallSchedule !== CAPITAL_CALL_SCHEDULES.SINGLE && (
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
                      percentage: 0,
                      amountType: 'percentage' // Default to percentage
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
                      <div className="flex flex-col w-36">
                        <div className="flex justify-between items-center mb-1">
                          <Label htmlFor={`callPercentage-${index}`} className="text-xs">
                            {call.amountType === 'dollar' ? 'Amount' : 'Percentage'}
                          </Label>
                          <Select
                            value={call.amountType || 'percentage'}
                            onValueChange={(value) => {
                              const updatedCalls = [...customCalls];
                              updatedCalls[index].amountType = value;
                              setCustomCalls(updatedCalls);
                              setAllocationData({
                                ...allocationData,
                                customSchedule: JSON.stringify(updatedCalls)
                              });
                            }}
                          >
                            <SelectTrigger className="h-6 text-xs border-none bg-transparent px-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="dollar">Dollar Amount</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="relative">
                          <span className="absolute inset-y-0 right-3 flex items-center text-neutral-500">
                            {call.amountType === 'dollar' ? '$' : '%'}
                          </span>
                          <Input
                            id={`callPercentage-${index}`}
                            type="number"
                            min="0"
                            max={call.amountType === 'percentage' ? 100 : undefined}
                            step={call.amountType === 'dollar' ? 1000 : 1}
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
                    <div className="space-y-1">
                      {/* Show percentage total */}
                      <div className="text-sm">
                        {formatPercentage(
                          customCalls
                            .filter(call => call.amountType === 'percentage' || !call.amountType)
                            .reduce((sum, call) => sum + (call.percentage || 0), 0), 
                          FINANCIAL_CALCULATION.PRECISION.PERCENTAGE
                        )}
                      </div>
                      {/* Show dollar amount total if any dollar amounts exist */}
                      {customCalls.some(call => call.amountType === 'dollar') && (
                        <div className="text-sm">
                          ${customCalls
                              .filter(call => call.amountType === 'dollar')
                              .reduce((sum, call) => sum + (call.percentage || 0), 0)
                              .toLocaleString()}
                        </div>
                      )}
                    </div>
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