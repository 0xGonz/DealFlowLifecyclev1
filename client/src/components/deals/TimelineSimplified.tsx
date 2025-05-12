import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { UserAvatar } from "@/components/common/UserAvatar";
import { 
  ArrowRight,
  CheckCircle, 
  FileEdit,
  MessageSquare,
  Star,
  DollarSign,
  FileText,
  RocketIcon,
  Info,
  Trash2,
  Pencil,
  X,
  Check,
  AlertCircle
} from "lucide-react";
import { ICON_SIZES } from "@/lib/constants/ui-constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

// Types for timeline events and filtering
type EventType = 'note' | 'stage_change' | 'document_upload' | 'memo_added' | 'star_added' | 'ai_analysis' | 'fund_allocation';

interface TimelineEvent {
  id: number;
  dealId: number;
  eventType: EventType;
  content: string | null;
  createdBy: number;
  createdAt: string;
  metadata: Record<string, any> | null;
  user?: {
    id: number;
    fullName: string;
    initials: string;
    avatarColor: string | null;
    role?: string;
  };
}

interface TimelineProps {
  dealId?: number;
}

interface FilterOptions {
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export default function TimelineSimplified({ dealId }: TimelineProps) {
  // State for note input and editing
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<'note' | 'question' | 'decision' | 'concern'>('note');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);
  
  // State for filtering and view options (simplified)
  const [activeTab, setActiveTab] = useState<'all' | 'notes' | 'documents' | 'stages'>('all');
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'all'
  });
  
  const { toast } = useToast();
  const { data: user } = useAuth();

  // Fetch timeline events
  const { data: timelineData = [], isLoading } = useQuery<TimelineEvent[]>({
    queryKey: [`/api/deals/${dealId}/timeline`],
    enabled: !!dealId,
  });

  // Filter and process timeline data
  const filteredTimelineData = timelineData
    .filter(event => {
      // Filter by date range
      const eventDate = new Date(event.createdAt);
      const today = new Date();
      
      if (filters.dateRange === 'today') {
        const todayStart = new Date(today.setHours(0, 0, 0, 0));
        if (eventDate < todayStart) return false;
      }
      
      if (filters.dateRange === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        if (eventDate < weekStart) return false;
      }
      
      if (filters.dateRange === 'month') {
        const monthStart = new Date(today);
        monthStart.setMonth(monthStart.getMonth() - 1);
        if (eventDate < monthStart) return false;
      }
      
      // Apply tab filtering
      if (activeTab === 'notes' && event.eventType !== 'note') return false;
      if (activeTab === 'documents' && event.eventType !== 'document_upload') return false;
      if (activeTab === 'stages' && event.eventType !== 'stage_change') return false;
      
      return true;
    })
    // Sort by date descending (newest first)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Function to set date range filter
  const setDateRangeFilter = (range: FilterOptions['dateRange']) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
  };

  const addNoteMutation = useMutation({
    mutationFn: async (data: { content: string, noteType: string }) => {
      return apiRequest("POST", `/api/deals/${dealId}/timeline`, {
        eventType: "note",
        content: data.content,
        metadata: { noteType: data.noteType }
      });
    },
    onSuccess: async () => {
      setNewNote("");
      toast({
        title: "Note added",
        description: "Your note has been added to the timeline."
      });
      await queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/timeline`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ 
      eventId, 
      content
    }: { 
      eventId: number, 
      content: string
    }) => {
      return apiRequest("PUT", `/api/deals/${dealId}/timeline/${eventId}`, {
        content
      });
    },
    onSuccess: async () => {
      setEditingEventId(null);
      setEditContent("");
      toast({
        title: "Note updated",
        description: "Your note has been updated successfully."
      });
      await queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/timeline`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update note. Please try again.",
        variant: "destructive"
      });
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return apiRequest("DELETE", `/api/deals/${dealId}/timeline/${eventId}`);
    },
    onSuccess: async () => {
      setEventToDelete(null);
      toast({
        title: "Note deleted",
        description: "Your note has been removed from the timeline."
      });
      await queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/timeline`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate({
      content: newNote,
      noteType: noteType
    });
  };

  const handleEditNote = (event: TimelineEvent) => {
    setEditingEventId(event.id);
    setEditContent(event.content || '');
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setEditContent("");
  };

  const handleSaveEdit = () => {
    if (!editContent.trim() || !editingEventId) return;
    
    updateNoteMutation.mutate({ 
      eventId: editingEventId, 
      content: editContent
    });
  };

  const handleDeleteNote = (eventId: number) => {
    setEventToDelete(eventId);
  };

  const confirmDeleteNote = () => {
    if (eventToDelete) {
      deleteNoteMutation.mutate(eventToDelete);
    }
  };
  
  // Check if the current user can edit/delete a note
  const canModifyNote = (event: TimelineEvent) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return event.createdBy === user.id;
  };

  // Helper to get the appropriate icon for each event type
  const getEventIcon = (eventType: string) => {
    const containerClass = `flex items-center justify-center rounded-full w-8 h-8 shadow-sm`;
    const iconClass = `w-4 h-4 text-white`;
    
    switch (eventType) {
      case 'stage_change':
        return (
          <div className={`${containerClass} bg-primary`}>
            <CheckCircle className={iconClass} />
          </div>
        );
      case 'memo_added':
        return (
          <div className={`${containerClass} bg-accent`}>
            <FileEdit className={iconClass} />
          </div>
        );
      case 'note':
        return (
          <div className={`${containerClass} bg-secondary`}>
            <MessageSquare className={iconClass} />
          </div>
        );
      case 'star_added':
        return (
          <div className={`${containerClass} bg-yellow-500`}>
            <Star className={iconClass} />
          </div>
        );
      case 'document_upload':
        return (
          <div className={`${containerClass} bg-blue-500`}>
            <FileText className={iconClass} />
          </div>
        );
      case 'fund_allocation':
        return (
          <div className={`${containerClass} bg-green-500`}>
            <DollarSign className={iconClass} />
          </div>
        );
      case 'ai_analysis':
        return (
          <div className={`${containerClass} bg-purple-500`}>
            <RocketIcon className={iconClass} />
          </div>
        );
      default:
        return (
          <div className={`${containerClass} bg-gray-500`}>
            <Info className={iconClass} />
          </div>
        );
    }
  };

  return (
    <div>

      {/* Timeline events - Simplified */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
              <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
              <TabsTrigger value="documents" className="flex-1">Docs</TabsTrigger>
              <TabsTrigger value="stages" className="flex-1">Changes</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex justify-end items-center mb-4">
          <Select value={filters.dateRange} onValueChange={(value) => setDateRangeFilter(value as any)}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <p className="text-neutral-500">Loading timeline...</p>
          </div>
        ) : filteredTimelineData.length === 0 ? (
          <div className="flex justify-center items-center py-10">
            <p className="text-neutral-500">No timeline events match your filters.</p>
          </div>
        ) : (
          filteredTimelineData.map((event: TimelineEvent) => (
            <div key={event.id} className="relative pl-12 mb-3">
              <div className="absolute left-0 top-0">
                {getEventIcon(event.eventType)}
              </div>
              
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {event.user && typeof event.user === 'object' ? (
                        <>
                          <UserAvatar user={event.user} size="sm" />
                          <div>
                            <p className="font-medium text-sm">{typeof event.user.fullName === 'string' ? event.user.fullName : 'Unknown User'}</p>
                            <p className="text-xs text-neutral-500">
                              {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div>
                          <p className="font-medium text-sm">Unknown User</p>
                          <p className="text-xs text-neutral-500">
                            {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {event.eventType === 'note' && canModifyNote(event) && (
                      <div className="flex space-x-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleEditNote(event)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDeleteNote(event.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Display different content based on event type */}
                  {event.eventType === 'note' && (
                    <>
                      {/* Different styling for note types */}
                      {event.metadata?.noteType && typeof event.metadata.noteType === 'string' && (
                        <Badge 
                          className={`mt-2 mb-2 ${
                            event.metadata.noteType === 'question' ? 'bg-amber-500' : 
                            event.metadata.noteType === 'decision' ? 'bg-green-500' : 
                            event.metadata.noteType === 'concern' ? 'bg-red-500' : ''
                          }`}
                        >
                          {event.metadata.noteType.charAt(0).toUpperCase() + event.metadata.noteType.slice(1)}
                        </Badge>
                      )}
                      
                      {/* Note content or edit form */}
                      {editingEventId === event.id ? (
                        <div className="mt-2 space-y-2">
                          <Textarea 
                            value={editContent} 
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[100px]"
                          />
                          <div className="flex space-x-2">
                            <Button size="sm" onClick={handleSaveEdit} disabled={updateNoteMutation.isPending}>
                              {updateNoteMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap mt-2">
                          {typeof event.content === 'string' ? event.content : ''}
                        </div>
                      )}
                    </>
                  )}
                  
                  {event.eventType !== 'note' && (
                    <div className="text-sm mt-2">
                      {typeof event.content === 'string' ? event.content : ''}
                    </div>
                  )}
                  
                  {/* Simplified metadata display */}
                  {event.eventType === 'document_upload' && event.metadata?.documentId && (
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-blue-50">
                        <FileText className="h-3 w-3 mr-1" /> 
                        {typeof event.metadata.fileName === 'string' ? event.metadata.fileName : 'Document'}
                      </Badge>
                    </div>
                  )}
                  
                  {event.eventType === 'fund_allocation' && event.metadata?.fundId && (
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-green-50">
                        <DollarSign className="h-3 w-3 mr-1" /> 
                        {typeof event.metadata.fundName === 'string' ? event.metadata.fundName : 'Fund'}: 
                        {typeof event.metadata.amount === 'string' || typeof event.metadata.amount === 'number' 
                          ? event.metadata.amount 
                          : '0'} 
                        {event.metadata.amountType === 'percentage' ? '%' : '$'}
                      </Badge>
                    </div>
                  )}
                  
                  {event.eventType === 'ai_analysis' && (
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-purple-50">
                        <RocketIcon className="h-3 w-3 mr-1" /> 
                        AI Analysis
                      </Badge>
                    </div>
                  )}
                  
                  {event.eventType === 'stage_change' && event.metadata && (
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-primary-50">
                        <ArrowRight className="h-3 w-3 mr-1" /> 
                        From {Array.isArray(event.metadata.previousStage) 
                          ? typeof event.metadata.previousStage[0] === 'string' 
                            ? event.metadata.previousStage[0]
                            : 'Previous Stage' 
                          : typeof event.metadata.previousStage === 'string'
                            ? event.metadata.previousStage
                            : 'Previous Stage'
                        } 
                        → 
                        {Array.isArray(event.metadata.newStage)
                          ? typeof event.metadata.newStage[0] === 'string'
                            ? event.metadata.newStage[0]
                            : 'New Stage'
                          : typeof event.metadata.newStage === 'string'
                            ? event.metadata.newStage
                            : 'New Stage'
                        }
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
      
      {/* Deletion alert dialog */}
      <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteNote}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}