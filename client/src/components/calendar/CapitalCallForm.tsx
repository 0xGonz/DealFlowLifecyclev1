import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { DATE_FORMATS } from '@/lib/constants/time-constants';
import { CAPITAL_CALL_STATUS } from '@/lib/constants/capital-call-constants';
import { Deal, FundAllocation } from '@/lib/types';

// Define form schema
const capitalCallFormSchema = z.object({
  allocationId: z.coerce.number(),
  percentage: z.coerce.number().min(0, 'Percentage must be 0 or greater').max(100, 'Percentage cannot exceed 100'),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().optional(),
  createdBy: z.number().optional(),
});

type CapitalCallFormValues = z.infer<typeof capitalCallFormSchema>;

interface CapitalCallFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
}

const CapitalCallForm: React.FC<CapitalCallFormProps> = ({ isOpen, onClose, selectedDate }) => {
  const { toast } = useToast();
  const { data: user } = useAuth();
  const queryClient = useQueryClient();
  
  // Fetch deals
  const { data: deals = [], isLoading: isLoadingDeals } = useQuery<Deal[]>({
    queryKey: ['/api/deals'],
  });
  
  // Fetch fund allocations
  const { data: allocations = [], isLoading: isLoadingAllocations } = useQuery<FundAllocation[]>({
    queryKey: ['/api/fund-allocations'],
  });
  
  const form = useForm<CapitalCallFormValues>({
    resolver: zodResolver(capitalCallFormSchema),
    defaultValues: {
      dueDate: selectedDate ? format(selectedDate, DATE_FORMATS.ISO) : undefined,
      percentage: undefined,
      allocationId: undefined,
      notes: '',
      createdBy: user?.id
    }
  });
  
  const createCapitalCall = useMutation({
    mutationFn: async (data: CapitalCallFormValues) => {
      const response = await apiRequest('POST', '/api/capital-calls', data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the capital calls query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/capital-calls'] });
      
      toast({
        title: 'Success',
        description: 'Capital call created successfully',
        variant: 'default',
      });
      
      // Close the dialog
      onClose();
    },
    onError: (error) => {
      console.error('Error creating capital call:', error);
      toast({
        title: 'Error',
        description: 'Failed to create capital call',
        variant: 'destructive',
      });
    }
  });
  
  const onSubmit = (data: CapitalCallFormValues) => {
    // Make sure the user ID is included
    if (!data.createdBy && user?.id) {
      data.createdBy = user.id;
    }
    
    // Submit the form data
    createCapitalCall.mutate(data);
  };
  
  // Helper to get deal name by deal ID from allocation
  const getDealNameById = (dealId: number) => {
    const deal = deals.find(d => d.id === dealId);
    return deal ? deal.name : 'Unknown Deal';
  };
  
  // Helper to get fund name by fund ID from allocation
  const getFundNameById = (fundId: number) => {
    // This would typically come from a fund query, but for simplicity we'll just return the ID
    return `Fund ${fundId}`;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create Capital Call</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Fund Allocation selector */}
            <FormField
              control={form.control}
              name="allocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fund Allocation</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fund allocation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingAllocations ? (
                        <div className="p-2 flex justify-center">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        allocations.map((allocation) => (
                          <SelectItem key={allocation.id} value={allocation.id.toString()}>
                            {getDealNameById(allocation.dealId)} - {getFundNameById(allocation.fundId)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Percentage input */}
            <FormField
              control={form.control}
              name="percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Percentage</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="Percentage" 
                        {...field} 
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === '' ? undefined : parseFloat(value));
                        }}
                        value={field.value === undefined ? '' : field.value}
                        className="pr-8"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-500">
                        %
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Due date input */}
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Notes textarea */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional information here"
                      className="resize-none"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={createCapitalCall.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createCapitalCall.isPending}
              >
                {createCapitalCall.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Capital Call
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CapitalCallForm;