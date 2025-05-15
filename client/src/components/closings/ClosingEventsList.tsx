import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  Check,
  Clock,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  CLOSING_EVENT_STATUS, 
  CLOSING_EVENT_TYPES, 
  CLOSING_EVENT_TYPE_LABELS 
} from '@/lib/constants/closing-event-constants';
import { formatCurrency } from '@/lib/utils/format';

interface ClosingEventsListProps {
  dealId: number;
  onEditEvent?: (eventId: number) => void;
}

interface ClosingEvent {
  id: number;
  dealId: number;
  createdBy: number;
  eventType: string;
  eventName: string;
  scheduledDate: string;
  targetAmount: number | null;
  amountType: 'percentage' | 'dollar';
  status: string;
  notes: string | null;
  actualDate: string | null;
  actualAmount: number | null;
  dealName: string;
}

// Status labels for display purposes
const CLOSING_EVENT_STATUS_LABELS: Record<string, string> = {
  'scheduled': 'Scheduled',
  'completed': 'Completed',
  'delayed': 'Delayed',
  'cancelled': 'Cancelled'
};

export default function ClosingEventsList({ dealId, onEditEvent }: ClosingEventsListProps) {
  const { toast } = useToast();
  const [eventToDelete, setEventToDelete] = React.useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  
  // Fetch closing events for this deal
  const { data: closingEvents = [], isLoading } = useQuery<ClosingEvent[]>({
    queryKey: [`/api/closing-schedules/deal/${dealId}`],
    enabled: !!dealId
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return apiRequest('DELETE', `/api/closing-schedules/${eventId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/closing-schedules/deal/${dealId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/closing-schedules'] });
      toast({
        title: 'Closing event deleted',
        description: 'The closing event has been successfully deleted.',
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error deleting closing event',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  });
  
  // Mark as completed mutation
  const markAsCompletedMutation = useMutation({
    mutationFn: async ({ eventId, actualAmount }: { eventId: number, actualAmount?: number }) => {
      return apiRequest('PATCH', `/api/closing-schedules/${eventId}/status`, {
        status: 'completed',
        actualDate: new Date().toISOString(),
        actualAmount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/closing-schedules/deal/${dealId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/closing-schedules'] });
      toast({
        title: 'Closing event completed',
        description: 'The closing event has been marked as completed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating closing event',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  });
  
  const handleDelete = (eventId: number) => {
    setEventToDelete(eventId);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (eventToDelete) {
      deleteMutation.mutate(eventToDelete);
    }
  };
  
  const handleMarkAsCompleted = (event: ClosingEvent) => {
    const actualAmount = event.targetAmount !== null ? event.targetAmount : undefined;
    markAsCompletedMutation.mutate({ 
      eventId: event.id,
      actualAmount
    });
  };
  
  const formatAmount = (amount: number | null, amountType: 'percentage' | 'dollar') => {
    if (amount === null) return '-';
    
    return amountType === 'dollar' 
      ? formatCurrency(amount)
      : `${amount}%`;
  };
  
  if (isLoading) {
    return (
      <div className="text-center py-8 text-neutral-500">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-opacity-50 border-t-primary rounded-full mx-auto mb-4"></div>
        <p>Loading closing events...</p>
      </div>
    );
  }
  
  if (closingEvents.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
        <h3 className="text-lg font-medium mb-1">No closing events</h3>
        <p className="text-sm">No closing events have been scheduled for this deal yet.</p>
      </div>
    );
  }
  
  return (
    <div>
      <h3 className="text-lg font-medium mb-3">Closing Events</h3>
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Scheduled Date</TableHead>
              <TableHead>Target Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {closingEvents.map(event => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">{event.eventName}</TableCell>
                <TableCell>{CLOSING_EVENT_TYPE_LABELS[event.eventType as keyof typeof CLOSING_EVENT_TYPE_LABELS] || event.eventType}</TableCell>
                <TableCell>
                  {format(new Date(event.scheduledDate), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {event.targetAmount ? formatAmount(event.targetAmount, event.amountType) : '-'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={event.status === 'completed' ? 'default' :
                      event.status === 'scheduled' ? 'secondary' :
                      event.status === 'delayed' ? 'outline' : 'destructive'}
                  >
                    {CLOSING_EVENT_STATUS_LABELS[event.status] || event.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-2">
                    {event.status !== 'completed' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMarkAsCompleted(event)}
                        title="Mark as completed"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {onEditEvent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditEvent(event.id)}
                        title="Edit closing event"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(event.id)}
                      title="Delete closing event"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this closing event?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The closing event will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {deleteMutation.isPending ? "Deleting..." : "Delete Event"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}