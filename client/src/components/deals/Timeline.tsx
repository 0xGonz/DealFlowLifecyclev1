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
  Info
} from "lucide-react";

interface TimelineProps {
  dealId?: number;
}

export default function Timeline({ dealId }: TimelineProps) {
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();

  const { data: timelineEvents, isLoading } = useQuery({
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

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote);
  };

  // Helper to get the appropriate icon for each event type
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'stage_change':
        return (
          <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-primary-light flex items-center justify-center z-10">
            <CheckCircle className="h-3 w-3 text-white" />
          </div>
        );
      case 'memo_added':
        return (
          <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-accent flex items-center justify-center z-10">
            <FileEdit className="h-3 w-3 text-white" />
          </div>
        );
      case 'note':
        return (
          <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center z-10">
            <MessageSquare className="h-3 w-3 text-white" />
          </div>
        );
      case 'star_added':
        return (
          <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-accent flex items-center justify-center z-10">
            <Star className="h-3 w-3 text-white" />
          </div>
        );
      case 'document_upload':
        return (
          <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center z-10">
            <FileText className="h-3 w-3 text-white" />
          </div>
        );
      case 'fund_allocation':
        return (
          <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-success flex items-center justify-center z-10">
            <DollarSign className="h-3 w-3 text-white" />
          </div>
        );
      case 'ai_analysis':
        return (
          <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-info flex items-center justify-center z-10">
            <RocketIcon className="h-3 w-3 text-white" />
          </div>
        );
      default:
        return (
          <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-info flex items-center justify-center z-10">
            <Info className="h-3 w-3 text-white" />
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
        ) : timelineEvents?.length === 0 ? (
          <div className="flex justify-center items-center py-10">
            <p className="text-neutral-500">No timeline events yet.</p>
          </div>
        ) : (
          timelineEvents?.map((event: any) => (
            <div key={event.id} className="timeline-dot relative pl-8 pb-6">
              {getEventIcon(event.eventType)}
              <div>
                <div className="flex justify-between">
                  <span className="text-xs text-neutral-500">
                    {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-neutral-800 mt-1">{event.content}</p>
                
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
