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
  Users,
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

  // getDealStageBadgeClass is imported from utils/format.ts

  return (
    <Card 
      className="bg-white rounded-lg shadow pipeline-card overflow-hidden cursor-pointer"
      onClick={() => navigate(`/deals/${deal.id}`)}
    >
      <CardContent className={`p-4 ${compact ? 'pb-2' : ''}`}>
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-lg">{deal.name}</h3>
          <span className={`deal-stage-badge ${getDealStageBadgeClass(deal.stage)}`}>
            {deal.stageLabel}
          </span>
        </div>
        
        {!compact && (
          <p className="text-sm text-neutral-600 mb-3">
            {deal.description.length > 60 
              ? `${deal.description.substring(0, 60)}...` 
              : deal.description}
          </p>
        )}
        
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center text-sm text-neutral-500">
            <Users className="h-4 w-4 mr-1" />
            {deal.round || "Unknown Round"}
          </div>
          
          <div className="flex items-center text-sm">
            <Tag className="h-4 w-4 mr-1 text-primary" />
            <span className="text-primary-dark font-medium">
              {deal.sector}
            </span>
          </div>
        </div>
        
        {!compact && (
          <div className="flex items-center text-sm text-neutral-500 mb-4">
            <DollarSign className="h-4 w-4 mr-1" />
            {(deal.targetRaise || deal.valuation) 
              ? `${deal.targetRaise || ''} ${deal.targetRaise && deal.valuation ? ', ' : ''} ${deal.valuation || ''}` 
              : 'No financial details'}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {assignedUsers.slice(0, 3).map((user: User) => (
              <Avatar key={user.id} className="w-8 h-8 border-2 border-white">
                <AvatarFallback style={{ backgroundColor: user.avatarColor }}>
                  {user.initials}
                </AvatarFallback>
              </Avatar>
            ))}
            {assignedUsers.length > 3 && (
              <Avatar className="w-8 h-8 border-2 border-white">
                <AvatarFallback className="bg-neutral-300 text-neutral-700 text-xs">
                  +{assignedUsers.length - 3}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          
          {!compact && (
            <div className="flex items-center">
              <span className="text-xs text-neutral-500">
                Updated {formatDistanceToNow(new Date(deal.updatedAt), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      
      {!compact && (
        <CardFooter className="border-t border-neutral-200 p-3 flex justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-neutral-600 hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit();
            }}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className={`${deal.starCount ? 'text-accent' : 'text-neutral-600 hover:text-primary'}`}
            onClick={handleStarDeal}
          >
            <Star className={`h-4 w-4 mr-1 ${deal.starCount ? 'fill-current' : ''}`} />
            {deal.starCount ? `${deal.starCount}` : 'Star'}
          </Button>
          
          {deal.stage === 'invested' && onAllocate ? (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-neutral-600 hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onAllocate();
              }}
            >
              <DollarSign className="h-4 w-4 mr-1" />
              Allocate
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-neutral-600 hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
