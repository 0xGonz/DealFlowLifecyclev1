import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, isPast, addDays, isToday } from 'date-fns';
import { CAPITAL_CALL_STATUS_COLORS } from '@/lib/constants/style-constants';
import { DATE_FORMATS } from '@/lib/constants/format-constants';
import { CAPITAL_CALL_STATUS, CAPITAL_CALL_STATUS_LABELS } from '@/lib/constants/allocation-constants';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';

// Status colors are now imported from style-constants.ts

interface CapitalCall {
  id: number;
  allocationId: number;
  callAmount: number;
  callDate: string;
  dueDate: string;
  paidAmount: number;
  paidDate: string | null;
  status: typeof CAPITAL_CALL_STATUS[keyof typeof CAPITAL_CALL_STATUS];
  notes: string | null;
  dealName: string; // Added through API join
  fundName: string; // Added through API join
}

const CapitalCalls = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedView, setSelectedView] = useState<'calendar' | 'list'>('calendar');
  const [filter, setFilter] = useState<string>('all');
  
  const { data: capitalCalls = [], isLoading } = useQuery<CapitalCall[]>({
    queryKey: ['/api/capital-calls'],
  });

  // Filter capital calls based on selected date and filter option
  const filteredCalls = React.useMemo(() => {
    if (!selectedDate) return [];
    
    const dateStr = format(selectedDate, DATE_FORMATS.ISO);
    let filtered = capitalCalls.filter(call => {
      const callDateMatch = call.callDate.startsWith(dateStr);
      const dueDateMatch = call.dueDate.startsWith(dateStr);
      const paidDateMatch = call.paidDate?.startsWith(dateStr);
      
      return callDateMatch || dueDateMatch || paidDateMatch;
    });
    
    if (filter !== 'all') {
      filtered = filtered.filter(call => call.status === filter);
    }
    
    return filtered;
  }, [capitalCalls, selectedDate, filter]);

  // Generate calendar highlights based on capital calls
  const calendarHighlights = React.useMemo(() => {
    const highlights: { [key: string]: { count: number, types: Set<string> } } = {};
    
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
    
    return highlights;
  }, [capitalCalls]);

  // Custom day render function for the calendar
  const renderDay = (date: Date) => {
    const dateStr = format(date, DATE_FORMATS.ISO);
    const highlight = calendarHighlights[dateStr];
    
    const isPastDate = isPast(date) && !isToday(date);
    const isSelected = selectedDate && format(selectedDate, DATE_FORMATS.ISO) === dateStr;
    
    let bgClass = '';
    if (highlight) {
      if (highlight.types.has('due')) {
        bgClass = 'bg-amber-50';
      }
      if (highlight.types.has('call')) {
        bgClass = 'bg-blue-50';
      }
      if (highlight.types.has('paid')) {
        bgClass = 'bg-green-50';
      }
      if (isSelected) {
        bgClass = '';
      }
    }
    
    return (
      <div className={`w-full h-full flex items-center justify-center rounded-md relative ${bgClass}`}>
        <span className={`${isPastDate ? 'text-neutral-400' : ''}`}>
          {format(date, 'd')}
        </span>
        {highlight && (
          <div className="absolute bottom-1 flex gap-0.5 justify-center">
            {highlight.count > 0 && (
              <div className="h-1 w-1 rounded-full bg-blue-500"></div>
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
          <h1 className="text-3xl font-bold">Capital Calls</h1>
          
          <div className="flex gap-2">
            <Tabs 
              value={selectedView} 
              onValueChange={(value) => setSelectedView(value as 'calendar' | 'list')}
              className="w-[340px]"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Select value={filter} onValueChange={setFilter}>
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
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
          {/* Calendar */}
          <Card className={selectedView === 'list' ? 'hidden md:block' : ''}>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                components={{
                  Day: (props) => (
                    <button {...props} className="h-9 w-9 p-0 font-normal">
                      {renderDay(props.date)}
                    </button>
                  ),
                }}
              />
              <div className="mt-3 text-xs text-neutral-500">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>Call Date</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span>Due Date</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Paid Date</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Capital calls for selected date */}
          <div>
            {selectedView === 'calendar' && selectedDate && (
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
            
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
              </div>
            ) : filteredCalls.length === 0 ? (
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
                          <div className="text-lg">${call.callAmount.toLocaleString()}</div>
                          {call.paidAmount > 0 && (
                            <div className="text-xs text-neutral-500">
                              Paid: ${call.paidAmount.toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium">Call Date</div>
                          <div className="text-base">{format(new Date(call.callDate), DATE_FORMATS.DEFAULT)}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Due Date</div>
                          <div className="text-base">{format(new Date(call.dueDate), DATE_FORMATS.DEFAULT)}</div>
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
        </div>
      </div>
    </AppLayout>
  );
};

export default CapitalCalls;