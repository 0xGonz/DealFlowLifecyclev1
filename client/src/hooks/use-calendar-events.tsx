import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { DATE_FORMATS } from '@/lib/constants/time-constants';
import { CALENDAR_EVENT_TYPES } from '@/lib/constants/calendar-constants';

/**
 * A custom hook for managing and filtering calendar events
 * Centralizes the event data fetching and filtering logic
 */
interface CapitalCall {
  id: number;
  allocationId: number;
  callAmount: number;
  callDate: string;
  dueDate: string;
  paidAmount: number;
  paidDate: string | null;
  status: string;
  notes: string | null;
  dealName: string; 
  fundName: string;
}

interface ClosingScheduleEvent {
  id: number;
  dealId: number;
  createdBy: number;
  eventType: string;
  eventName: string;
  scheduledDate: string;
  targetAmount: number | null;
  status: string;
  notes: string | null;
  actualDate: string | null;
  actualAmount: number | null;
  dealName: string;
}

interface UseCalendarEventsResult {
  capitalCalls: CapitalCall[];
  closingEvents: ClosingScheduleEvent[];
  filteredCalls: CapitalCall[];
  filteredClosingEvents: ClosingScheduleEvent[];
  calendarHighlights: { [key: string]: { count: number, types: Set<string> } };
  isLoading: boolean;
}

export function useCalendarEvents(
  selectedDate: Date | undefined,
  activeTab: string,
  statusFilter: string,
  eventTypeFilter: string
): UseCalendarEventsResult {
  // Fetch capital calls
  const { data: capitalCalls = [], isLoading: isLoadingCalls } = useQuery<CapitalCall[]>({
    queryKey: ['/api/capital-calls'],
  });
  
  // Fetch closing schedule events
  const { data: closingEvents = [], isLoading: isLoadingEvents } = useQuery<ClosingScheduleEvent[]>({
    queryKey: ['/api/closing-schedules'],
  });
  
  const isLoading = isLoadingCalls || isLoadingEvents;

  // Filter events based on selected date, tab and status filters
  const filteredCalls = React.useMemo(() => {
    if (!selectedDate) return [];
    
    const dateStr = format(selectedDate, DATE_FORMATS.ISO);
    let filtered = capitalCalls.filter(call => {
      const callDateMatch = call.callDate.startsWith(dateStr);
      const dueDateMatch = call.dueDate.startsWith(dateStr);
      const paidDateMatch = call.paidDate?.startsWith(dateStr);
      
      return callDateMatch || dueDateMatch || paidDateMatch;
    });
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(call => call.status === statusFilter);
    }
    
    return filtered;
  }, [capitalCalls, selectedDate, statusFilter]);

  // Filter closing schedule events based on selected date and filters
  const filteredClosingEvents = React.useMemo(() => {
    if (!selectedDate) return [];
    
    const dateStr = format(selectedDate, DATE_FORMATS.ISO);
    let filtered = closingEvents.filter(event => {
      const scheduledDateMatch = event.scheduledDate.startsWith(dateStr);
      const actualDateMatch = event.actualDate?.startsWith(dateStr);
      
      return scheduledDateMatch || actualDateMatch;
    });
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
    }
    
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(event => event.eventType === eventTypeFilter);
    }
    
    return filtered;
  }, [closingEvents, selectedDate, statusFilter, eventTypeFilter]);

  // Generate calendar highlights based on capital calls and closing events
  const calendarHighlights = React.useMemo(() => {
    const highlights: { [key: string]: { count: number, types: Set<string> } } = {};
    
    // Show capital calls only if on 'all' or 'capital-calls' tab
    if (activeTab === CALENDAR_EVENT_TYPES.ALL || activeTab === CALENDAR_EVENT_TYPES.CAPITAL_CALLS) {
      // Add capital call highlights
      capitalCalls.forEach(call => {
        // Format dates to YYYY-MM-DD strings for comparison
        const callDateStr = call.callDate.split('T')[0];
        const dueDateStr = call.dueDate.split('T')[0];
        
        // Add call date highlight
        if (!highlights[callDateStr]) {
          highlights[callDateStr] = { count: 0, types: new Set() };
        }
        highlights[callDateStr].count++;
        highlights[callDateStr].types.add('call');
        
        // Add due date highlight
        if (!highlights[dueDateStr]) {
          highlights[dueDateStr] = { count: 0, types: new Set() };
        }
        highlights[dueDateStr].count++;
        highlights[dueDateStr].types.add('due');
        
        // Add paid date highlight if it exists
        if (call.paidDate) {
          const paidDateStr = call.paidDate.split('T')[0];
          if (!highlights[paidDateStr]) {
            highlights[paidDateStr] = { count: 0, types: new Set() };
          }
          highlights[paidDateStr].count++;
          highlights[paidDateStr].types.add('paid');
        }
      });
    }
    
    // Show closing events only if on 'all' or 'closing-events' tab
    if (activeTab === CALENDAR_EVENT_TYPES.ALL || activeTab === CALENDAR_EVENT_TYPES.CLOSING_EVENTS) {
      // Add closing event highlights
      closingEvents.forEach(event => {
        // Format dates to YYYY-MM-DD strings for comparison
        const scheduledDateStr = event.scheduledDate.split('T')[0];
        
        // Add scheduled date highlight
        if (!highlights[scheduledDateStr]) {
          highlights[scheduledDateStr] = { count: 0, types: new Set() };
        }
        highlights[scheduledDateStr].count++;
        highlights[scheduledDateStr].types.add('closing');
        
        // Add actual date highlight if it exists
        if (event.actualDate) {
          const actualDateStr = event.actualDate.split('T')[0];
          if (!highlights[actualDateStr]) {
            highlights[actualDateStr] = { count: 0, types: new Set() };
          }
          highlights[actualDateStr].count++;
          highlights[actualDateStr].types.add('completed');
        }
      });
    }
    
    return highlights;
  }, [capitalCalls, closingEvents, activeTab]);

  return {
    capitalCalls,
    closingEvents,
    filteredCalls,
    filteredClosingEvents,
    calendarHighlights,
    isLoading
  };
}
