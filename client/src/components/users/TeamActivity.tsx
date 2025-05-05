import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { 
  CheckCircle, 
  FileEdit,
  Info,
  DollarSign,
  Star,
  FileText,
  UserPlus,
  Settings
} from "lucide-react";
import { ICON_SIZES } from "@/lib/constants/ui-constants";

interface ActivityItem {
  id: number;
  dealId: number;
  eventType: 'stage_change' | 'memo_added' | 'note' | 'star_added' | 'document_upload' | 'fund_allocation' | 'ai_analysis' | 'user_assignment' | 'profile_update';
  content: string;
  createdAt: string;
  deal?: {
    id: number;
    name: string;
    stageLabel?: string;
  };
  user?: {
    id: number;
    fullName: string;
    initials: string;
    avatarColor: string;
  };
}

export default function TeamActivity() {
  const { data: activities = [] as ActivityItem[], isLoading } = useQuery<ActivityItem[]>({
    queryKey: ['/api/activity'],
  });

  // Helper to get the appropriate icon for each event type
  const getEventIcon = (eventType: string) => {
    const containerClass = `absolute -left-2.5 sm:-left-3 top-0 ${ICON_SIZES.TIMELINE.CONTAINER.RESPONSIVE} rounded-full flex items-center justify-center z-10`;
    const iconClass = `${ICON_SIZES.TIMELINE.ICON.RESPONSIVE} text-white`;
    
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
            <FileEdit className={iconClass} />
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
          <div className={`${containerClass} bg-info`}>
            <FileText className={iconClass} />
          </div>
        );
      case 'fund_allocation':
        return (
          <div className={`${containerClass} bg-success`}>
            <DollarSign className={iconClass} />
          </div>
        );
      case 'user_assignment':
        return (
          <div className={`${containerClass} bg-purple-500`}>
            <UserPlus className={iconClass} />
          </div>
        );
      case 'profile_update':
        return (
          <div className={`${containerClass} bg-blue-500`}>
            <Settings className={iconClass} />
          </div>
        );
      case 'ai_analysis':
        return (
          <div className={`${containerClass} bg-primary`}>
            <Info className={iconClass} />
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
    <Card className="bg-white rounded-lg shadow h-full w-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle>Team Activity</CardTitle>
      </CardHeader>
      
      <CardContent className="max-h-96 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="py-6 text-center text-neutral-500">
            Loading activity...
          </div>
        ) : activities?.length === 0 ? (
          <div className="py-6 text-center text-neutral-500">
            No recent team activity to display.
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="timeline-dot relative pl-6 sm:pl-8 pb-5 sm:pb-6 border-l border-neutral-200 ml-2.5 sm:ml-3">
              {getEventIcon(activity.eventType)}
              <div>
                <div className="flex flex-col xs:flex-row justify-between">
                  <p className="font-medium text-xs sm:text-sm">
                    {activity.user && (
                      <span className="font-semibold truncate block xs:inline">{activity.user.fullName} </span>
                    )}
                    <span className="text-neutral-700">{getActivityTitle(activity)}</span>
                    {activity.deal?.name && (
                      <span className="font-semibold truncate block xs:inline"> {activity.deal.name}</span>
                    )}
                  </p>
                  <span className="text-[10px] xs:text-xs text-neutral-500 mt-0.5 xs:mt-0">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-600 mt-1 line-clamp-2">{activity.content}</p>
                
                {activity.user && (
                  <div className="flex items-center mt-2">
                    <Avatar className="h-4 w-4 sm:h-5 sm:w-5 mr-1">
                      <AvatarFallback style={{ backgroundColor: activity.user.avatarColor, fontSize: '9px' }}>
                        {activity.user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] xs:text-xs text-neutral-500">{activity.user.fullName}</span>
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
function getActivityTitle(activity: ActivityItem) {
  switch (activity.eventType) {
    case 'stage_change':
      return `moved ${activity.deal?.name} to ${activity.deal?.stageLabel || 'new stage'}`;
    case 'memo_added':
      return 'added a mini-memo to';
    case 'note':
      return 'added a note to';
    case 'star_added':
      return 'starred';
    case 'document_upload':
      return 'uploaded a document to';
    case 'ai_analysis':
      return 'requested AI analysis for';
    case 'user_assignment':
      return 'was assigned to';
    case 'profile_update':
      return 'updated their profile';
    default:
      return 'updated';
  }
}
