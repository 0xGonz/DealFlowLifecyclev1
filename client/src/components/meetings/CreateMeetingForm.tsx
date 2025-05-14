import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface CreateMeetingFormProps {
  dealId: number;
  isOpen: boolean;
  onClose: () => void;
}

// Form schema using zod
const meetingFormSchema = z.object({
  dealId: z.number(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  date: z.string(), // Keep as string for form handling
  attendees: z.string().optional(),
  notes: z.string().optional(),
  createdBy: z.number(),
});

type MeetingFormValues = z.infer<typeof meetingFormSchema>;

export function CreateMeetingForm({ dealId, isOpen, onClose }: CreateMeetingFormProps) {
  const { toast } = useToast();
  const today = new Date();
  const defaultDateTime = format(today, "yyyy-MM-dd'T'HH:mm");
  
  // Get current user ID from auth context or session
  const userId = 4; // Hardcoded for now, should come from auth context
  
  // Form setup with default values
  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      dealId,
      title: '',
      date: defaultDateTime,
      attendees: '',
      notes: '',
      createdBy: userId,
    },
  });
  
  // Create meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: async (data: MeetingFormValues) => {
      // Transform date to the format the API expects
      const transformedData = {
        ...data,
        // We keep the date as a string throughout the form
      };
      return apiRequest('POST', `/api/meetings`, transformedData);
    },
    onSuccess: () => {
      // Update queries that depend on meetings data
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/deal/${dealId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      
      toast({
        title: 'Meeting created',
        description: 'The meeting has been successfully scheduled.',
      });
      
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error creating meeting',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
  
  const onSubmit = (data: MeetingFormValues) => {
    createMeetingMutation.mutate(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule Meeting</DialogTitle>
          <DialogDescription>
            Create a new meeting for this deal. All meetings will appear in the calendar.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Initial Discussion" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="attendees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attendees</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Smith, Jane Doe (comma separated)" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter attendee names separated by commas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any meeting notes or agenda items" {...field} />
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
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createMeetingMutation.isPending}
              >
                {createMeetingMutation.isPending ? 'Creating...' : 'Schedule Meeting'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}