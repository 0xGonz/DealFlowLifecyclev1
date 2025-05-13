import React from 'react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, DollarSign } from 'lucide-react';

interface CapitalCallPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  capitalCallId: number;
  callAmount: number;
  paidAmount?: number;
  onSuccess?: () => void;
}

// Create a schema for form validation
const paymentFormSchema = z.object({
  paymentAmount: z.coerce.number().positive('Amount must be greater than 0'),
  paymentDate: z.date({
    required_error: 'Payment date is required',
  }),
  paymentType: z.enum(['wire', 'check', 'ach', 'other'], {
    required_error: 'Please select a payment type',
  }),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export function CapitalCallPaymentForm({
  isOpen,
  onClose,
  capitalCallId,
  callAmount,
  paidAmount = 0,
  onSuccess,
}: CapitalCallPaymentFormProps) {
  const { toast } = useToast();
  const remainingAmount = callAmount - paidAmount;

  // Create form with validation
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paymentAmount: remainingAmount,
      paymentDate: new Date(),
      paymentType: 'wire',
      notes: '',
    },
  });

  // Add payment mutation
  const addPaymentMutation = useMutation({
    mutationFn: async (values: PaymentFormValues) => {
      return apiRequest('POST', `/api/capital-calls/${capitalCallId}/payments`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/capital-calls/deal`] });
      toast({
        title: 'Payment recorded',
        description: 'The payment has been successfully recorded.',
      });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error recording payment',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  });

  function onSubmit(values: PaymentFormValues) {
    addPaymentMutation.mutate(values);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for this capital call.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="paymentAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        className="pl-9"
                        {...field}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (value > remainingAmount) {
                            field.onChange(remainingAmount);
                          } else {
                            field.onChange(value);
                          }
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Remaining amount: ${remainingAmount.toLocaleString()}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Payment Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={`w-full pl-3 text-left font-normal ${
                            !field.value ? "text-muted-foreground" : ""
                          }`}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a payment type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="wire">Wire Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="ach">ACH Transfer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any payment details or reference numbers"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addPaymentMutation.isPending}
              >
                {addPaymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}