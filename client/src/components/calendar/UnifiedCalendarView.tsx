import React from 'react';
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
import { useCalendarEvents, CalendarEvent } from '@/hooks/use-calendar-events';
import { Skeleton } from '@/components/ui/skeleton';

interface UnifiedCalendarViewProps {
  dealId: number;
  onCreateCapitalCall?: () => void;
  onCreateMeeting?: () => void;
}

export default function UnifiedCalendarView({ 
  dealId, 
  onCreateCapitalCall, 
  onCreateMeeting 
}: UnifiedCalendarViewProps) {
  const { 
    allEvents, 
    counts, 
    isLoading 
  } = useCalendarEvents(dealId);
  
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
  
  return (
    <div className="space-y-6">
      {isLoading ? (
        // Loading state
        <div className="space-y-6">
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="flex justify-end gap-2">
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      ) : (
        <>
          <div className="bg-gradient-to-r from-muted/50 to-muted/30 p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium mb-2">Calendar Events Summary</h3>
            <div className="flex flex-wrap gap-3">
              <Badge variant={counts.capitalCalls > 0 ? "default" : "outline"} className="flex items-center gap-1.5 py-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                <span>{counts.capitalCalls} Capital Call{counts.capitalCalls !== 1 && 's'}</span>
              </Badge>
              <Badge variant={counts.meetings > 0 ? "secondary" : "outline"} className="flex items-center gap-1.5 py-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>{counts.meetings} Meeting{counts.meetings !== 1 && 's'}</span>
              </Badge>
              <Badge variant={counts.closings > 0 ? "default" : "outline"} className="flex items-center gap-1.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300">
                <Calendar className="h-3.5 w-3.5" />
                <span>{counts.closings} Closing Event{counts.closings !== 1 && 's'}</span>
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {counts.total > 0 ? 
                `Showing ${counts.total} calendar event${counts.total !== 1 ? 's' : ''} in chronological order` : 
                ''}
            </div>
            <div className="flex gap-2">
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
          </div>
          
          <div className="space-y-8">
            {Object.keys(eventsByMonth).length > 0 ? (
              Object.entries(eventsByMonth).map(([month, events]) => (
                <div key={month} className="space-y-3">
                  <h3 className="text-lg font-medium pb-2 border-b">
                    {month}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({events.length} event{events.length !== 1 && 's'})
                    </span>
                  </h3>
                  <div className="space-y-4">
                    {events.map(event => (
                      <Card 
                        key={`${event.type}-${event.id}`} 
                        className={`overflow-hidden border-l-4 ${event.color} hover:shadow-md transition-shadow`}
                      >
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
                              <div className="bg-muted/40 rounded-md p-3 mt-2 text-sm grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
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
              <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-1">No events scheduled</h3>
                <p className="text-sm">
                  No calendar events have been scheduled for this deal yet.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  {onCreateCapitalCall && (
                    <Button size="sm" variant="outline" onClick={onCreateCapitalCall}>
                      <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                      Add Capital Call
                    </Button>
                  )}
                  {onCreateMeeting && (
                    <Button size="sm" variant="outline" onClick={onCreateMeeting}>
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      Add Meeting
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}