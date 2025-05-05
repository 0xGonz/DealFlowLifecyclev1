import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { 
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
  Check
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
import { useAuth } from "@/hooks/use-auth";

interface TimelineProps {
  dealId?: number;
}

export default function Timeline({ dealId }: TimelineProps) {
  const [newNote, setNewNote] = useState("");
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);
  const { toast } = useToast();
  const { data: user } = useAuth();

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/deals/${dealId}/timeline`],
    enabled: !!dealId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/deals/${dealId}/timeline`, {
        eventType: "note",
        content,
        metadata: {}
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
    mutationFn: async ({ eventId, content }: { eventId: number, content: string }) => {
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
    addNoteMutation.mutate(newNote);
  };

  const handleEditNote = (event: any) => {
    setEditingEventId(event.id);
    setEditContent(event.content);
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setEditContent("");
  };

  const handleSaveEdit = () => {
    if (!editContent.trim() || !editingEventId) return;
    updateNoteMutation.mutate({ eventId: editingEventId, content: editContent });
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
  const canModifyNote = (event: any) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return event.createdBy === user.id;
  };

  // Helper to get the appropriate icon for each event type
  const getEventIcon = (eventType: string) => {
    const containerClass = `absolute left-0 top-0 ${ICON_SIZES.TIMELINE.CONTAINER.DEFAULT} rounded-full flex items-center justify-center z-10`;
    const iconClass = `${ICON_SIZES.TIMELINE.ICON.DEFAULT} text-white`;
    
    switch (eventType) {
      case 'stage_change':
        return (
          <div className={`${containerClass} bg-primary-light`}>
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
          <div className={`${containerClass} bg-accent`}>
            <Star className={iconClass} />
          </div>
        );
      case 'document_upload':
        return (
          <div className={`${containerClass} bg-secondary`}>
            <FileText className={iconClass} />
          </div>
        );
      case 'fund_allocation':
        return (
          <div className={`${containerClass} bg-success`}>
            <DollarSign className={iconClass} />
          </div>
        );
      case 'ai_analysis':
        return (
          <div className={`${containerClass} bg-info`}>
            <RocketIcon className={iconClass} />
          </div>
        );
      default:
        return (
          <div className={`${containerClass} bg-info`}>
            <Info className={iconClass} />
          </div>
        );
    }
  };

  return (
    <div>
      {/* Add quick note field */}
      <div className="mb-6">
        <div className="flex space-x-2">
          <Textarea 
            placeholder="Add a quick note..." 
            className="resize-none"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <Button 
            className="shrink-0"
            onClick={handleAddNote}
            disabled={addNoteMutation.isPending || !newNote.trim()}
          >
            {addNoteMutation.isPending ? "Adding..." : "Add"}
          </Button>
        </div>
      </div>

      {/* Timeline events */}
      <div className="space-y-0 max-h-[500px] overflow-y-auto scrollbar-thin pr-2">
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <p className="text-neutral-500">Loading timeline...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex justify-center items-center py-10">
            <p className="text-neutral-500">No timeline events yet.</p>
          </div>
        ) : (
          data.map((event: any) => (
            <div key={event.id} className="timeline-dot relative pl-8 pb-6">
              {getEventIcon(event.eventType)}
              <div>
                <div className="flex justify-between">
                  <span className="text-xs text-neutral-500">
                    {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                  </span>
                  {event.eventType === 'note' && canModifyNote(event) && (
                    <div className="flex space-x-1">
                      {/* Edit button */}
                      <button 
                        onClick={() => handleEditNote(event)}
                        className="text-neutral-400 hover:text-primary-dark transition-colors">
                        <Pencil size={14} />
                      </button>
                      
                      {/* Delete button */}
                      <AlertDialog open={eventToDelete === event.id} onOpenChange={(open) => !open && setEventToDelete(null)}>
                        <AlertDialogTrigger asChild>
                          <button 
                            onClick={() => handleDeleteNote(event.id)}
                            className="text-neutral-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </AlertDialogTrigger>
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
                  )}
                </div>
                
                {editingEventId === event.id ? (
                  <div className="mt-1">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="resize-none text-sm min-h-[60px] mb-2"
                    />
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCancelEdit}
                        className="h-7 px-2 text-xs"
                      >
                        <X size={12} className="mr-1" /> Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSaveEdit}
                        disabled={updateNoteMutation.isPending || !editContent.trim()}
                        className="h-7 px-2 text-xs"
                      >
                        <Check size={12} className="mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-800 mt-1">{event.content}</p>
                )}
                
                {event.user && (
                  <div className="flex items-center mt-2">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarFallback style={{ backgroundColor: event.user.avatarColor || '#0E4DA4' }}>
                        {event.user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-neutral-500">{event.user.fullName}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
