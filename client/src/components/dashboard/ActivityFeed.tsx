import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { 
  CheckCircle, 
  FileEdit,
  Info,
  DollarSign,
  Star
} from "lucide-react";

export default function ActivityFeed() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['/api/activity'],
  });

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
            <FileEdit className="h-3 w-3 text-white" />
          </div>
        );
      case 'star_added':
        return (
          <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-accent flex items-center justify-center z-10">
            <Star className="h-3 w-3 text-white" />
          </div>
        );
      case 'fund_allocation':
        return (
          <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-success flex items-center justify-center z-10">
            <DollarSign className="h-3 w-3 text-white" />
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
    <Card className="bg-white rounded-lg shadow">
      <CardHeader className="pb-3">
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      
      <CardContent className="max-h-96 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="py-6 text-center text-neutral-500">
            Loading activity...
          </div>
        ) : activities?.length === 0 ? (
          <div className="py-6 text-center text-neutral-500">
            No recent activity to display.
          </div>
        ) : (
          activities?.map((activity: any) => (
            <div key={activity.id} className="timeline-dot relative pl-8 pb-6">
              {getEventIcon(activity.eventType)}
              <div>
                <div className="flex justify-between">
                  <p className="font-medium text-sm">
                    {activity.deal?.name && (
                      <span className="font-semibold">{activity.deal.name} </span>
                    )}
                    {getActivityTitle(activity)}
                  </p>
                  <span className="text-xs text-neutral-500">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 mt-1">{activity.content}</p>
                
                {activity.user && (
                  <div className="flex items-center mt-2">
                    <Avatar className="h-5 w-5 mr-1">
                      <AvatarFallback style={{ backgroundColor: activity.user.avatarColor, fontSize: '10px' }}>
                        {activity.user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-neutral-500">{activity.user.fullName}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to generate a readable title for each activity type
function getActivityTitle(activity: any) {
  switch (activity.eventType) {
    case 'stage_change':
      return `moved to ${activity.deal?.stageLabel || 'new stage'}`;
    case 'memo_added':
      return 'had a mini-memo added';
    case 'note':
      return 'had a note added';
    case 'star_added':
      return 'was starred';
    case 'document_upload':
      return 'had a document uploaded';
    case 'ai_analysis':
      return 'was analyzed by AI';
    default:
      return 'was updated';
  }
}
