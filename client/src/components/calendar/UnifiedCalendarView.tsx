import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Card,
  CardContent
} from '@/components/ui/card';
import { Calendar, DollarSign, Clock, Users, Calendar as CalendarIcon, FileText, Percent } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UnifiedCalendarViewProps {
  dealId: number;
  onCreateCapitalCall?: () => void;
  onCreateMeeting?: () => void;
}

type EventType = 'capital-call' | 'meeting' | 'closing';

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  type: EventType;
  status?: string;
  allocation?: string;
  amountValue?: number | string;
  amountType?: string;
  notes?: string;
  attendees?: string;
  dealName?: string;
  icon: React.ReactNode;
  color: string;
  detailItems?: {label: string; value: string}[];
}

export default function UnifiedCalendarView({ 
  dealId, 
  onCreateCapitalCall, 
  onCreateMeeting 
}: UnifiedCalendarViewProps) {
  // Fetch capital calls
  const { data: capitalCalls = [] } = useQuery<any[]>({
    queryKey: [`/api/capital-calls/deal/${dealId}`],
    enabled: !!dealId
  });
  
  // Fetch meetings
  const { data: meetings = [] } = useQuery<any[]>({
    queryKey: [`/api/meetings/deal/${dealId}`],
    enabled: !!dealId
  });
  
  // Fetch closing events
  const { data: closingEvents = [] } = useQuery<any[]>({
    queryKey: [`/api/closing-schedules/deal/${dealId}`],
    enabled: !!dealId
  });
  
  // Transform all data into a unified calendar event format
  const allEvents: CalendarEvent[] = React.useMemo(() => {
    const events: CalendarEvent[] = [];
    
    // Add capital calls
    (capitalCalls as any[]).forEach((call) => {
      events.push({
        id: call.id,
        title: `Capital Call (${call.fundName})`,
        date: call.dueDate,
        type: 'capital-call',
        allocation: call.fundName,
        amountValue: call.callAmount,
        amountType: 'currency',
        status: call.status,
        icon: <DollarSign className="h-4 w-4" />,
        color: 'bg-green-100 border-green-600',
        detailItems: [
          { label: 'Fund', value: call.fundName || 'N/A' },
          { label: 'Amount', value: `$${Number(call.callAmount || 0).toLocaleString()}` },
          { label: 'Status', value: call.status ? call.status.charAt(0).toUpperCase() + call.status.slice(1) : 'N/A' }
        ]
      });
    });
    
    // Add meetings
    (meetings as any[]).forEach((meeting) => {
      events.push({
        id: meeting.id,
        title: meeting.title,
        date: meeting.date,
        type: 'meeting',
        attendees: meeting.attendees,
        notes: meeting.notes,
        icon: <Users className="h-4 w-4" />,
        color: 'bg-blue-100 border-blue-600',
        detailItems: [
          { label: 'Attendees', value: meeting.attendees || 'None specified' },
          { label: 'Notes', value: meeting.notes || 'No notes recorded' }
        ]
      });
    });
    
    // Add closing events
    (closingEvents as any[]).forEach((event) => {
      const isPercentage = event.amountType === 'percentage';
      events.push({
        id: event.id,
        title: event.eventName,
        date: event.scheduledDate,
        type: 'closing',
        status: event.status,
        amountValue: event.targetAmount,
        amountType: event.amountType,
        notes: event.notes,
        icon: <Calendar className="h-4 w-4" />,
        color: 'bg-purple-100 border-purple-600',
        detailItems: [
          { label: 'Amount', value: isPercentage 
            ? `${event.targetAmount}%` 
            : `$${Number(event.targetAmount || 0).toLocaleString()}` 
          },
          { label: 'Status', value: event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'N/A' },
          { label: 'Notes', value: event.notes || 'No notes recorded' }
        ]
      });
    });
    
    // Sort by date (earliest first)
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [capitalCalls, meetings, closingEvents]);
  
  // Group events by month for better visualization
  const eventsByMonth = React.useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    
    allEvents.forEach(event => {
      const date = new Date(event.date);
      const monthYear = format(date, 'MMMM yyyy');
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      
      grouped[monthYear].push(event);
    });
    
    return grouped;
  }, [allEvents]);
  
  // Event type counts for summary
  const counts = {
    capitalCalls: allEvents.filter(e => e.type === 'capital-call').length,
    meetings: allEvents.filter(e => e.type === 'meeting').length,
    closings: allEvents.filter(e => e.type === 'closing').length,
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-muted/40 p-3 rounded-lg">
        <h3 className="text-sm font-medium mb-2">Calendar Summary</h3>
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="flex items-center gap-1.5 py-1">
            <DollarSign className="h-3.5 w-3.5" />
            <span>{counts.capitalCalls} Capital Call{counts.capitalCalls !== 1 && 's'}</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1.5 py-1">
            <Users className="h-3.5 w-3.5" />
            <span>{counts.meetings} Meeting{counts.meetings !== 1 && 's'}</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1.5 py-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{counts.closings} Closing Event{counts.closings !== 1 && 's'}</span>
          </Badge>
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        {onCreateCapitalCall && (
          <Button size="sm" onClick={onCreateCapitalCall}>
            <DollarSign className="h-3.5 w-3.5 mr-1.5" />
            Schedule Call
          </Button>
        )}
        {onCreateMeeting && (
          <Button size="sm" variant="outline" onClick={onCreateMeeting}>
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Schedule Meeting
          </Button>
        )}
      </div>
      
      <div className="space-y-8">
        {Object.keys(eventsByMonth).length > 0 ? (
          Object.entries(eventsByMonth).map(([month, events]) => (
            <div key={month} className="space-y-2">
              <h3 className="text-lg font-medium mb-3 border-b pb-1">{month}</h3>
              <div className="space-y-4">
                {events.map(event => (
                  <Card key={`${event.type}-${event.id}`} className={`overflow-hidden border-l-4 ${event.color} hover:shadow-md transition-shadow`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-full border shadow-sm">
                              {event.icon}
                            </div>
                            <div>
                              <div className="font-medium text-base">{event.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(event.date), 'EEEE, MMMM d, yyyy')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {event.status && (
                              <Badge variant={
                                event.status === 'completed' ? 'default' : 
                                event.status === 'scheduled' ? 'secondary' : 
                                event.status === 'delayed' ? 'outline' : 'destructive'
                              } className="text-xs">
                                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                              </Badge>
                            )}
                            
                            {event.amountValue && (
                              <Badge className={`flex items-center gap-1 ${event.amountType === 'percentage' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}>
                                {event.amountType === 'percentage' ? (
                                  <>
                                    <Percent className="h-3 w-3" />
                                    {event.amountValue}%
                                  </>
                                ) : (
                                  <>
                                    <DollarSign className="h-3 w-3" />
                                    {Number(event.amountValue).toLocaleString()}
                                  </>
                                )}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {event.detailItems && event.detailItems.length > 0 && (
                          <div className="bg-muted/40 rounded-md p-2 mt-2 text-sm grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                            {event.detailItems.map((item, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="font-medium text-xs min-w-[70px]">{item.label}:</span>
                                <span className="text-xs overflow-hidden text-ellipsis">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-1">No events scheduled</h3>
            <p className="text-sm">
              No calendar events have been scheduled for this deal yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}