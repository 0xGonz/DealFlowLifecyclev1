import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, isPast, addDays, isToday } from 'date-fns';
import { DATE_FORMATS } from '@/lib/constants/time-constants';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { formatAmountByType } from '@/lib/utils/format';
import { 
  CAPITAL_CALL_STATUS, 
  CAPITAL_CALL_STATUS_COLORS, 
  CAPITAL_CALL_STATUS_LABELS 
} from '@/lib/constants/capital-call-constants';
import {
  CLOSING_EVENT_STATUS,
  CLOSING_EVENT_STATUS_COLORS,
  CLOSING_EVENT_STATUS_LABELS,
  CLOSING_EVENT_TYPES,
  CLOSING_EVENT_TYPE_LABELS
} from '@/lib/constants/closing-event-constants';
import {
  CALENDAR_HIGHLIGHT_COLORS,
  CALENDAR_INDICATOR_COLORS,
  CALENDAR_VIEWS,
  CALENDAR_LAYOUT,
  CALENDAR_EVENT_TYPES,
  type CalendarView
} from '@/lib/constants/calendar-constants';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import ClosingEventForm from '@/components/calendar/ClosingEventForm';
import CapitalCallForm from '@/components/calendar/CapitalCallForm';
import { useAuth } from '@/hooks/use-auth';

interface CapitalCall {
  id: number;
  allocationId: number;
  callAmount: number;
  amountType: 'percentage' | 'dollar';
  callDate: string;
  dueDate: string;
  paidAmount: number;
  paidDate: string | null;
  status: typeof CAPITAL_CALL_STATUS[keyof typeof CAPITAL_CALL_STATUS];
  notes: string | null;
  dealName: string; // Added through API join
  fundName: string; // Added through API join
}

interface ClosingScheduleEvent {
  id: number;
  dealId: number;
  createdBy: number;
  eventType: typeof CLOSING_EVENT_TYPES[keyof typeof CLOSING_EVENT_TYPES];
  eventName: string;
  scheduledDate: string;
  targetAmount: number | null;
  amountType: 'percentage' | 'dollar';
  status: typeof CLOSING_EVENT_STATUS[keyof typeof CLOSING_EVENT_STATUS];
  notes: string | null;
  actualDate: string | null;
  actualAmount: number | null;
  dealName: string; // Added through API join
}

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedView, setSelectedView] = useState<CalendarView>(CALENDAR_VIEWS.CALENDAR);
  const [activeTab, setActiveTab] = useState<string>(CALENDAR_EVENT_TYPES.ALL);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  
  // State for forms
  const [isClosingEventFormOpen, setIsClosingEventFormOpen] = useState(false);
  const [isCapitalCallFormOpen, setIsCapitalCallFormOpen] = useState(false);
  
  // Ensure authentication is valid on this page
  const { data: currentUser } = useAuth();
  
  // We don't need to call refreshAuth here anymore - ProtectedRoute already does it
  // and it causes a race condition
  
  // Fetch capital calls - no need to add auth check since ProtectedRoute handles it
  const { data: capitalCalls = [], isLoading: isLoadingCalls } = useQuery<CapitalCall[]>({
    queryKey: ['/api/capital-calls'],
  });
  
  // Fetch closing schedule events - no need to add auth check since ProtectedRoute handles it
  const { data: closingEvents = [], isLoading: isLoadingEvents } = useQuery<ClosingScheduleEvent[]>({
    queryKey: ['/api/closing-schedules'],
  });
  
  const isLoading = isLoadingCalls || isLoadingEvents;
  
  // Debug authentication state
  console.log('Calendar page auth state:', { 
    isAuthenticated: !!currentUser, 
    username: currentUser?.username
  });
  
  // Safely handle authentication
  useEffect(() => {
    if (!currentUser) {
      // This page should only be reached through ProtectedRoute, 
      // but add additional safety check
      console.log('No current user in Calendar, authentication check should happen in ProtectedRoute');
    }
  }, [currentUser]);

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

  // Custom day render function for the calendar
  const renderDay = (date: Date) => {
    const dateStr = format(date, DATE_FORMATS.ISO);
    const highlight = calendarHighlights[dateStr];
    
    const isPastDate = isPast(date) && !isToday(date);
    const isSelected = selectedDate && format(selectedDate, DATE_FORMATS.ISO) === dateStr;
    
    let bgClass = '';
    if (highlight) {
      if (highlight.types.has('due')) {
        bgClass = CALENDAR_HIGHLIGHT_COLORS.DUE;
      }
      if (highlight.types.has('call')) {
        bgClass = CALENDAR_HIGHLIGHT_COLORS.CALL;
      }
      if (highlight.types.has('paid')) {
        bgClass = CALENDAR_HIGHLIGHT_COLORS.PAID;
      }
      if (highlight.types.has('closing')) {
        bgClass = CALENDAR_HIGHLIGHT_COLORS.CLOSING;
      }
      if (highlight.types.has('completed')) {
        bgClass = CALENDAR_HIGHLIGHT_COLORS.ACTUAL_CLOSING;
      }
      if (isSelected) {
        bgClass = '';
      }
    }
    
    return (
      <div className={`w-full h-full flex items-center justify-center rounded-md relative ${bgClass}`}>
        <span className={`text-lg ${isPastDate ? 'text-muted-foreground' : ''}`}>
          {format(date, 'd')}
        </span>
        {highlight && (
          <div className="absolute bottom-1 flex gap-1 justify-center">
            {highlight.types.has('call') && (
              <div className={`h-2.5 w-2.5 rounded-full ${CALENDAR_INDICATOR_COLORS.CALL}`}></div>
            )}
            {highlight.types.has('closing') && (
              <div className={`h-2.5 w-2.5 rounded-full ${CALENDAR_INDICATOR_COLORS.CLOSING}`}></div>
            )}
          </div>
        )}
      </div>
    );
  };

  const nextDate = () => {
    if (selectedDate) {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const prevDate = () => {
    if (selectedDate) {
      setSelectedDate(addDays(selectedDate, -1));
    }
  };

  return (
    <AppLayout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Calendar</h1>
          
          <div className="flex gap-2 items-center">
            <div className="flex space-x-2 mr-2">
              <Button 
                onClick={() => setIsClosingEventFormOpen(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Closing Event
              </Button>
              <Button 
                onClick={() => setIsCapitalCallFormOpen(true)}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Capital Call
              </Button>
            </div>
            
            <Tabs 
              value={selectedView} 
              onValueChange={(value) => setSelectedView(value as CalendarView)}
              className="w-[340px]"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value={CALENDAR_VIEWS.CALENDAR}>Calendar View</TabsTrigger>
                <TabsTrigger value={CALENDAR_VIEWS.LIST}>List View</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CALENDAR_EVENT_TYPES.ALL}>All Events</SelectItem>
                <SelectItem value={CALENDAR_EVENT_TYPES.CAPITAL_CALLS}>Capital Calls</SelectItem>
                <SelectItem value={CALENDAR_EVENT_TYPES.CLOSING_EVENTS}>Closing Events</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-6 h-full">
          {/* Calendar */}
          <Card className={`h-full flex flex-col ${selectedView === CALENDAR_VIEWS.LIST ? 'hidden md:block' : ''}`}>
            <CardContent className="p-0 flex flex-col flex-grow h-full">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md w-full h-full flex-grow"
                components={{
                  Day: (props) => {
                    // Using a custom Day component to show events
                    return (
                      <button 
                        onClick={() => {
                          // Handle the click event manually
                          setSelectedDate(props.date);
                        }} 
                        className="w-full h-full min-w-[50px] min-h-[50px] p-0 my-0.5 font-normal text-base rounded-md flex items-center justify-center transition-colors hover:bg-neutral-100"
                      >
                        {renderDay(props.date)}
                      </button>
                    );
                  },
                }}
              />
              <div className="p-4 mt-auto text-sm text-neutral-600 bg-gray-50 border-t flex flex-wrap gap-4">
                {(activeTab === CALENDAR_EVENT_TYPES.ALL || activeTab === CALENDAR_EVENT_TYPES.CAPITAL_CALLS) && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${CALENDAR_INDICATOR_COLORS.CALL}`}></div>
                      <span>Capital Call</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${CALENDAR_INDICATOR_COLORS.DUE}`}></div>
                      <span>Due Date</span>
                    </div>
                  </>
                )}
                {(activeTab === CALENDAR_EVENT_TYPES.ALL || activeTab === CALENDAR_EVENT_TYPES.CLOSING_EVENTS) && (
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${CALENDAR_INDICATOR_COLORS.CLOSING}`}></div>
                    <span>Closing Event</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Events for selected date */}
          <div>
            {selectedView === CALENDAR_VIEWS.CALENDAR && selectedDate && (
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="icon" onClick={prevDate}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold">
                  {format(selectedDate, DATE_FORMATS.FULL)}
                </h2>
                <Button variant="outline" size="icon" onClick={nextDate}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Show status filter based on active tab */}
            <div className="mb-4">
              {activeTab === CALENDAR_EVENT_TYPES.CAPITAL_CALLS && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value={CAPITAL_CALL_STATUS.SCHEDULED}>Scheduled</SelectItem>
                    <SelectItem value={CAPITAL_CALL_STATUS.CALLED}>Called</SelectItem>
                    <SelectItem value={CAPITAL_CALL_STATUS.PARTIAL}>Partially Paid</SelectItem>
                    <SelectItem value={CAPITAL_CALL_STATUS.PAID}>Paid</SelectItem>
                    <SelectItem value={CAPITAL_CALL_STATUS.DEFAULTED}>Defaulted</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {activeTab === CALENDAR_EVENT_TYPES.CLOSING_EVENTS && (
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value={CLOSING_EVENT_STATUS.SCHEDULED}>Scheduled</SelectItem>
                      <SelectItem value={CLOSING_EVENT_STATUS.COMPLETED}>Completed</SelectItem>
                      <SelectItem value={CLOSING_EVENT_STATUS.DELAYED}>Delayed</SelectItem>
                      <SelectItem value={CLOSING_EVENT_STATUS.CANCELLED}>Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value={CLOSING_EVENT_TYPES.FIRST_CLOSE}>First Close</SelectItem>
                      <SelectItem value={CLOSING_EVENT_TYPES.SECOND_CLOSE}>Second Close</SelectItem>
                      <SelectItem value={CLOSING_EVENT_TYPES.FINAL_CLOSE}>Final Close</SelectItem>
                      <SelectItem value={CLOSING_EVENT_TYPES.EXTENSION}>Extension</SelectItem>
                      <SelectItem value={CLOSING_EVENT_TYPES.CUSTOM}>Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
              </div>
            ) : (
              <div>
                {/* Conditional rendering based on active tab */}
                {(activeTab === CALENDAR_EVENT_TYPES.ALL || activeTab === CALENDAR_EVENT_TYPES.CAPITAL_CALLS) && (
                  <div className="mb-6">
                    {activeTab === CALENDAR_EVENT_TYPES.ALL && (
                      <h3 className="text-lg font-semibold mb-3">Capital Calls</h3>
                    )}
                    
                    {filteredCalls.length === 0 ? (
                      <Card>
                        <CardContent className="p-6">
                          <div className="text-center text-neutral-500">
                            {selectedDate 
                              ? `No capital calls for ${format(selectedDate, DATE_FORMATS.FULL)}` 
                              : 'Select a date to view capital calls'}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {filteredCalls.map((call) => (
                          <Card key={call.id}>
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle>{call.dealName}</CardTitle>
                                  <CardDescription>{call.fundName}</CardDescription>
                                </div>
                                <Badge className={CAPITAL_CALL_STATUS_COLORS[call.status]}>
                                  {CAPITAL_CALL_STATUS_LABELS[call.status]}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <div className="text-sm font-medium">Amount</div>
                                  <div className="text-lg">{formatAmountByType(call.callAmount, call.amountType)}</div>
                                  {call.paidAmount > 0 && (
                                    <div className="text-xs text-neutral-500">
                                      Paid: {formatAmountByType(call.paidAmount, call.amountType)}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-medium">Call Date</div>
                                  <div className="text-base">{formatDate(call.callDate)}</div>
                                </div>
                                <div>
                                  <div className="text-sm font-medium">Due Date</div>
                                  <div className="text-base">{formatDate(call.dueDate)}</div>
                                </div>
                              </div>
                              {call.notes && (
                                <div className="mt-3 text-sm text-neutral-600 border-t pt-2">
                                  {call.notes}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {(activeTab === CALENDAR_EVENT_TYPES.ALL || activeTab === CALENDAR_EVENT_TYPES.CLOSING_EVENTS) && (
                  <div>
                    {activeTab === CALENDAR_EVENT_TYPES.ALL && (
                      <h3 className="text-lg font-semibold mb-3">Closing Events</h3>
                    )}
                    
                    {filteredClosingEvents.length === 0 ? (
                      <Card>
                        <CardContent className="p-6">
                          <div className="text-center text-neutral-500">
                            {selectedDate 
                              ? `No closing events for ${format(selectedDate, DATE_FORMATS.FULL)}` 
                              : 'Select a date to view closing events'}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {filteredClosingEvents.map((event) => (
                          <Card key={event.id}>
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle>{event.eventName}</CardTitle>
                                  <CardDescription>{event.dealName}</CardDescription>
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                  <Badge className={CLOSING_EVENT_STATUS_COLORS[event.status]}>
                                    {CLOSING_EVENT_STATUS_LABELS[event.status]}
                                  </Badge>
                                  <Badge variant="outline">
                                    {CLOSING_EVENT_TYPE_LABELS[event.eventType]}
                                  </Badge>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {event.targetAmount && (
                                  <div>
                                    <div className="text-sm font-medium">Target Amount</div>
                                    <div className="text-lg">{formatAmountByType(event.targetAmount, event.amountType)}</div>
                                    {event.actualAmount && (
                                      <div className="text-xs text-neutral-500">
                                        Actual: {formatAmountByType(event.actualAmount, event.amountType)}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div>
                                  <div className="text-sm font-medium">Scheduled Date</div>
                                  <div className="text-base">{formatDate(event.scheduledDate)}</div>
                                </div>
                                {event.actualDate && (
                                  <div>
                                    <div className="text-sm font-medium">Actual Date</div>
                                    <div className="text-base">{formatDate(event.actualDate)}</div>
                                  </div>
                                )}
                              </div>
                              {event.notes && (
                                <div className="mt-3 text-sm text-neutral-600 border-t pt-2">
                                  {event.notes}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Forms */}
      <ClosingEventForm
        isOpen={isClosingEventFormOpen}
        onClose={() => setIsClosingEventFormOpen(false)}
        selectedDate={selectedDate}
      />
      <CapitalCallForm
        isOpen={isCapitalCallFormOpen}
        onClose={() => setIsCapitalCallFormOpen(false)}
        selectedDate={selectedDate}
      />
    </AppLayout>
  );
};

export default CalendarPage;