import { useQuery } from '@tanstack/react-query';
import { DollarSign, Users, Calendar } from 'lucide-react';
import React from 'react';

export type CalendarEventType = 'capital-call' | 'meeting' | 'closing';

export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  type: CalendarEventType;
  status?: string;
  allocation?: string;
  amountValue?: number | string;
  amountType?: 'percentage' | 'currency';
  notes?: string;
  attendees?: string;
  dealName?: string;
  icon: React.ReactNode;
  color: string;
  detailItems?: {label: string; value: string}[];
}

/**
 * Custom hook to fetch and format all calendar events for a deal
 * @param dealId - The ID of the deal to fetch events for
 * @returns Object containing calendar events and loading states
 */
export function useCalendarEvents(dealId: number | undefined) {
  // Fetch capital calls
  const { 
    data: capitalCalls = [], 
    isLoading: isLoadingCapitalCalls 
  } = useQuery<any[]>({
    queryKey: [`/api/capital-calls/deal/${dealId}`],
    enabled: !!dealId
  });
  
  // Fetch meetings
  const { 
    data: meetings = [], 
    isLoading: isLoadingMeetings 
  } = useQuery<any[]>({
    queryKey: [`/api/meetings/deal/${dealId}`],
    enabled: !!dealId
  });
  
  // Fetch closing events
  const { 
    data: closingEvents = [], 
    isLoading: isLoadingClosingEvents 
  } = useQuery<any[]>({
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
        amountType: isPercentage ? 'percentage' : 'currency',
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
  
  // Calculate event counts
  const counts = React.useMemo(() => ({
    capitalCalls: allEvents.filter(e => e.type === 'capital-call').length,
    meetings: allEvents.filter(e => e.type === 'meeting').length,
    closings: allEvents.filter(e => e.type === 'closing').length,
    total: allEvents.length
  }), [allEvents]);

  const isLoading = isLoadingCapitalCalls || isLoadingMeetings || isLoadingClosingEvents;
  
  return {
    capitalCalls,
    meetings,
    closingEvents,
    allEvents,
    counts,
    isLoading
  };
}