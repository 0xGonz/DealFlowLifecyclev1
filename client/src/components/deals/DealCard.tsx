import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { 
  Edit, 
  Share2, 
  Star,
  DollarSign,
  Tag
} from "lucide-react";
import { Deal, User } from "@/lib/types";
import { getDealStageBadgeClass } from "@/lib/utils/format";
import { enrichDealWithComputedProps } from "@/lib/utils";

interface DealCardProps {
  deal: Deal;
  compact?: boolean;
  onEdit?: () => void;
  onAllocate?: () => void;
}

export default function DealCard({ deal: rawDeal, compact = false, onEdit, onAllocate }: DealCardProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Enrich deal with computed properties
  const deal = enrichDealWithComputedProps(rawDeal);

  // Get users to show avatars
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Get assigned user details for display
  const assignedUsers = deal.assignedUsers || [];

  // Function to handle starring a deal
  const handleStarDeal = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    
    try {
      await apiRequest("POST", `/api/deals/${deal.id}/star`, {});
      
      toast({
        title: "Deal starred",
        description: "This deal has been added to your starred deals."
      });
      
      // Refresh deals data and leaderboard
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to star deal. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card 
      className="bg-white rounded-lg shadow pipeline-card overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={() => navigate(`/deals/${deal.id}`)}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-wrap sm:flex-nowrap justify-between items-start mb-2 sm:mb-3 gap-1">
          <h3 className="font-semibold text-sm sm:text-base md:text-lg truncate mr-2 max-w-full sm:max-w-[70%]">{deal.name}</h3>
          <span className={`deal-stage-badge text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 leading-none whitespace-nowrap flex-shrink-0 ${getDealStageBadgeClass(deal.stage)}`}>
            {deal.stageLabel}
          </span>
        </div>
        
        <p className="text-xs sm:text-sm text-neutral-600 mb-3 line-clamp-2">
          {deal.description}
        </p>
        
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center text-xs sm:text-sm">
            <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 text-primary" />
            <span className="text-primary-dark font-medium truncate">
              {deal.sector}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex -space-x-1.5 sm:-space-x-2">
            {assignedUsers.slice(0, 3).map((user: User) => (
              <Avatar key={user.id} className="w-6 h-6 sm:w-7 sm:h-7 border-2 border-white">
                <AvatarFallback style={{ backgroundColor: user.avatarColor }} className="text-[10px] sm:text-xs">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
            ))}
            {assignedUsers.length > 3 && (
              <Avatar className="w-6 h-6 sm:w-7 sm:h-7 border-2 border-white">
                <AvatarFallback className="bg-neutral-300 text-neutral-700 text-[10px] sm:text-xs">
                  +{assignedUsers.length - 3}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          
          {!compact && (
            <div className="flex items-center">
              <span className="text-[10px] sm:text-xs text-neutral-500 max-w-[120px] sm:max-w-none truncate">
                Updated {formatDistanceToNow(new Date(deal.updatedAt), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="border-t border-neutral-200 p-2 sm:p-3 flex flex-wrap gap-1 sm:gap-2 w-full">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-neutral-600 hover:text-primary text-xs sm:text-sm flex-1 min-w-0 px-1.5 sm:px-3 h-7 sm:h-8"
          onClick={(e) => {
            e.stopPropagation();
            if (onEdit) onEdit();
          }}
        >
          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
          <span className="whitespace-nowrap overflow-hidden">Edit</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className={`text-xs sm:text-sm flex-1 min-w-0 px-1.5 sm:px-3 h-7 sm:h-8 ${deal.starCount ? 'text-accent' : 'text-neutral-600 hover:text-primary'}`}
          onClick={handleStarDeal}
        >
          <Star className={`h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 flex-shrink-0 ${deal.starCount ? 'fill-current' : ''}`} />
          <span className="whitespace-nowrap overflow-hidden">{deal.starCount ? `${deal.starCount}` : 'Star'}</span>
        </Button>
        
        {deal.stage === 'invested' && onAllocate ? (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-neutral-600 hover:text-primary text-xs sm:text-sm flex-1 min-w-0 px-1.5 sm:px-3 h-7 sm:h-8"
            onClick={(e) => {
              e.stopPropagation();
              onAllocate();
            }}
          >
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
            <span className="whitespace-nowrap overflow-hidden">Allocate</span>
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-neutral-600 hover:text-primary text-xs sm:text-sm flex-1 min-w-0 px-1.5 sm:px-3 h-7 sm:h-8"
            onClick={(e) => e.stopPropagation()}
          >
            <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
            <span className="whitespace-nowrap overflow-hidden">Share</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
