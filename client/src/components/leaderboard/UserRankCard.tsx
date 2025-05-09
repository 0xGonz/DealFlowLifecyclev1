import { UserLeaderboardItem } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate } from "@/lib/utils/format";
import { Progress } from "@/components/ui/progress";

interface UserRankCardProps {
  user: UserLeaderboardItem;
  rank: number;
  onClick?: () => void;
}

export default function UserRankCard({ user, rank, onClick }: UserRankCardProps) {
  const { fullName, initials, avatarColor, role, totalPoints, trend, pointsBreakdown, lastActiveDate } = user;
  
  const trendIndicator = () => {
    if (trend > 0) {
      return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    } else if (trend < 0) {
      return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  };
  
  // Calculate which activity contributes the most points
  const getTopActivity = () => {
    const activities = [
      { name: 'Stars', value: pointsBreakdown.starsGiven },
      { name: 'Assignments', value: pointsBreakdown.assignmentsCompleted },
      { name: 'Documents', value: pointsBreakdown.documentsUploaded },
      { name: 'Memos', value: pointsBreakdown.memosWritten },
      { name: 'Timeline Updates', value: pointsBreakdown.timelineUpdates },
      { name: 'Comments', value: pointsBreakdown.commentsAdded }
    ];
    
    return activities.sort((a, b) => b.value - a.value)[0].name;
  };
  
  // Calculate total breakdown points
  const totalBreakdownPoints = Object.values(pointsBreakdown).reduce((sum, val) => sum + val, 0);
  
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-xl font-bold text-gray-500">#{rank}</div>
            <Avatar className="h-8 w-8" style={{ backgroundColor: avatarColor }}>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{fullName}</CardTitle>
              <CardDescription className="text-xs capitalize">{role}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold">{totalPoints}</span>
            {trendIndicator()}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Point Breakdown</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs">
                    Top: {getTopActivity()}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Most points from {getTopActivity().toLowerCase()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="flex justify-between">
                  <span>Stars</span>
                  <span>{pointsBreakdown.starsGiven}</span>
                </div>
                <Progress value={(pointsBreakdown.starsGiven / totalBreakdownPoints) * 100} className="h-1 mt-1" />
              </div>
              <div>
                <div className="flex justify-between">
                  <span>Docs</span>
                  <span>{pointsBreakdown.documentsUploaded}</span>
                </div>
                <Progress value={(pointsBreakdown.documentsUploaded / totalBreakdownPoints) * 100} className="h-1 mt-1" />
              </div>
              <div>
                <div className="flex justify-between">
                  <span>Memos</span>
                  <span>{pointsBreakdown.memosWritten}</span>
                </div>
                <Progress value={(pointsBreakdown.memosWritten / totalBreakdownPoints) * 100} className="h-1 mt-1" />
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 flex justify-between items-center pt-1">
            <span>Last active: {formatDate(lastActiveDate)}</span>
            {user.topCategories.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {user.topCategories[0]} Leader
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}