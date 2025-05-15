import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Card,
  CardContent
} from '@/components/ui/card';
import { Calendar, DollarSign, Clock, Users, Calendar as CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  amount?: number | string;
  dealName?: string;
  icon: React.ReactNode;
  color: string;
}

export default function UnifiedCalendarView({ 
  dealId, 
  onCreateCapitalCall, 
  onCreateMeeting 
}: UnifiedCalendarViewProps) {
  const [view, setView] = React.useState<'all' | 'capital-calls' | 'meetings' | 'closings'>('all');
  
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
        amount: call.callAmount,
        status: call.status,
        icon: <DollarSign className="h-4 w-4" />,
        color: 'bg-green-100 border-green-600'
      });
    });
    
    // Add meetings
    (meetings as any[]).forEach((meeting) => {
      events.push({
        id: meeting.id,
        title: meeting.title,
        date: meeting.date,
        type: 'meeting',
        icon: <Users className="h-4 w-4" />,
        color: 'bg-blue-100 border-blue-600'
      });
    });
    
    // Add closing events
    (closingEvents as any[]).forEach((event) => {
      events.push({
        id: event.id,
        title: event.eventName,
        date: event.scheduledDate,
        type: 'closing',
        status: event.status,
        amount: event.targetAmount,
        icon: <Calendar className="h-4 w-4" />,
        color: 'bg-purple-100 border-purple-600'
      });
    });
    
    // Sort by date (most recent first)
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [capitalCalls, meetings, closingEvents]);
  
  // Filter events based on the selected view
  const filteredEvents = React.useMemo(() => {
    if (view === 'all') return allEvents;
    return allEvents.filter(event => event.type === view.replace(/-s$/, '') as EventType);
  }, [allEvents, view]);
  
  // Group events by month for better visualization
  const eventsByMonth = React.useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    
    filteredEvents.forEach(event => {
      const date = new Date(event.date);
      const monthYear = format(date, 'MMMM yyyy');
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      
      grouped[monthYear].push(event);
    });
    
    return grouped;
  }, [filteredEvents]);
  
  // Calculate counts for the view tabs
  const counts = React.useMemo(() => ({
    all: allEvents.length,
    'capital-calls': allEvents.filter(e => e.type === 'capital-call').length,
    meetings: allEvents.filter(e => e.type === 'meeting').length,
    closings: allEvents.filter(e => e.type === 'closing').length,
  }), [allEvents]);
  
  return (
    <div className="space-y-4">
      <Tabs 
        defaultValue="all" 
        value={view} 
        onValueChange={(value) => setView(value as any)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="all" className="text-xs">
            <CalendarIcon className="h-3.5 w-3.5 mr-1" />
            All {counts.all > 0 && <span className="ml-1 text-xs">({counts.all})</span>}
          </TabsTrigger>
          <TabsTrigger value="capital-calls" className="text-xs">
            <DollarSign className="h-3.5 w-3.5 mr-1" />
            Capital Calls {counts['capital-calls'] > 0 && <span className="ml-1 text-xs">({counts['capital-calls']})</span>}
          </TabsTrigger>
          <TabsTrigger value="meetings" className="text-xs">
            <Users className="h-3.5 w-3.5 mr-1" />
            Meetings {counts.meetings > 0 && <span className="ml-1 text-xs">({counts.meetings})</span>}
          </TabsTrigger>
          <TabsTrigger value="closings" className="text-xs">
            <Calendar className="h-3.5 w-3.5 mr-1" />
            Closings {counts.closings > 0 && <span className="ml-1 text-xs">({counts.closings})</span>}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="flex justify-end gap-2">
        {onCreateCapitalCall && (
          <Button size="sm" variant="outline" onClick={onCreateCapitalCall}>
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
              <h3 className="text-lg font-medium">{month}</h3>
              <div className="space-y-3">
                {events.map(event => (
                  <Card key={`${event.type}-${event.id}`} className={`overflow-hidden border-l-4 ${event.color}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-white rounded-full border">
                            {event.icon}
                          </div>
                          <div>
                            <div className="font-medium">{event.title}</div>
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
                          {event.amount && (
                            <div className="text-sm font-medium">
                              {typeof event.amount === 'number' ? `$${event.amount.toLocaleString()}` : event.amount}
                            </div>
                          )}
                        </div>
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
            <h3 className="text-lg font-medium mb-1">No events</h3>
            <p className="text-sm">
              {view === 'all' 
                ? 'No calendar events have been scheduled for this deal.' 
                : `No ${view.replace(/-$/, '')} have been scheduled for this deal.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}