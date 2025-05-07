import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, DollarSign, Percent } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';

interface EditCapitalCallFormProps {
  isOpen: boolean;
  onClose: () => void;
  capitalCall: any;
  dealId: number;
}

interface CapitalCallFormData {
  callAmount: number;
  amountType: 'percentage' | 'dollar';
  callDate: Date;
  dueDate: Date;
  notes: string;
  status: string;
  paidAmount?: number;
  paidDate?: Date | null;
}

export function EditCapitalCallForm({ isOpen, onClose, capitalCall, dealId }: EditCapitalCallFormProps) {
  const { toast } = useToast();
  
  // Initialize form data from capital call
  const [formData, setFormData] = useState<CapitalCallFormData>({
    callAmount: 0,
    amountType: 'dollar',
    callDate: new Date(),
    dueDate: new Date(),
    notes: '',
    status: 'scheduled',
    paidAmount: 0,
    paidDate: null
  });
  
  // Update form data when capital call changes
  useEffect(() => {
    if (capitalCall) {
      setFormData({
        callAmount: capitalCall.callAmount,
        amountType: capitalCall.amountType || 'dollar',
        callDate: capitalCall.callDate ? parseISO(capitalCall.callDate) : new Date(),
        dueDate: capitalCall.dueDate ? parseISO(capitalCall.dueDate) : addDays(new Date(), 30),
        notes: capitalCall.notes || '',
        status: capitalCall.status || 'scheduled',
        paidAmount: capitalCall.paidAmount || 0,
        paidDate: capitalCall.paidDate ? parseISO(capitalCall.paidDate) : null
      });
    }
  }, [capitalCall]);

  // Fetch allocations for this deal
  const { data: allocations = [] } = useQuery<any[]>({
    queryKey: [`/api/allocations/deal/${dealId}`],
    enabled: !!dealId
  });

  // Get fund name for the allocation
  const getFundName = () => {
    const allocation = allocations.find((a: any) => a.id === capitalCall.allocationId);
    return allocation?.fund?.name || `Fund #${allocation?.fundId || ''}`;
  };

  // Update capital call mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CapitalCallFormData) => {
      return apiRequest('PATCH', `/api/capital-calls/${capitalCall.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/capital-calls/deal/${dealId}`] });
      toast({
        title: 'Capital call updated',
        description: 'The capital call has been successfully updated.',
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error updating capital call',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateMutation.mutate({
      ...formData,
      // Make sure number values are converted from strings
      callAmount: typeof formData.callAmount === 'string' 
        ? parseFloat(formData.callAmount) 
        : formData.callAmount,
      paidAmount: formData.status === 'paid' 
        ? (typeof formData.paidAmount === 'string' 
            ? parseFloat(formData.paidAmount || '0') 
            : formData.paidAmount || 0)
        : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Capital Call</DialogTitle>
          <DialogDescription>
            Update details for capital call from {getFundName()}.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="callAmount">Amount</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {formData.amountType === 'dollar' ? (
                    <DollarSign className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Percent className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <Input
                  id="callAmount"
                  type="number"
                  step={formData.amountType === 'percentage' ? '0.01' : '1'}
                  min="0"
                  value={formData.callAmount}
                  onChange={(e) => setFormData({
                    ...formData,
                    callAmount: e.target.value ? parseFloat(e.target.value) : 0
                  })}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amountType">Amount Type</Label>
              <Select
                value={formData.amountType}
                onValueChange={(value) => setFormData({
                  ...formData,
                  amountType: value as 'percentage' | 'dollar'
                })}
              >
                <SelectTrigger id="amountType">
                  <SelectValue placeholder="Select amount type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dollar">Dollar Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="callDate">Call Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.callDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.callDate ? format(formData.callDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.callDate}
                    onSelect={(date) => date && setFormData({...formData, callDate: date})}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dueDate ? format(formData.dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate}
                    onSelect={(date) => date && setFormData({...formData, dueDate: date})}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({
                ...formData,
                status: value,
                // If status is paid and there's no paid date, set it to today
                paidDate: value === 'paid' && !formData.paidDate ? new Date() : formData.paidDate
              })}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="called">Called</SelectItem>
                <SelectItem value="partial">Partially Paid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="defaulted">Defaulted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {(formData.status === 'paid' || formData.status === 'partial') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paidAmount">Paid Amount</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                  </div>
                  <Input
                    id="paidAmount"
                    type="number"
                    min="0"
                    value={formData.paidAmount || 0}
                    onChange={(e) => setFormData({
                      ...formData,
                      paidAmount: e.target.value ? parseFloat(e.target.value) : 0
                    })}
                    className="pl-10"
                    required={formData.status === 'paid' || formData.status === 'partial'}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paidDate">Paid Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.paidDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.paidDate ? format(formData.paidDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.paidDate || undefined}
                      onSelect={(date) => setFormData({...formData, paidDate: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this capital call"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}