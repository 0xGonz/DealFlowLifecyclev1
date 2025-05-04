import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MiniMemoDisplay } from './MiniMemoDisplay';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle } from 'lucide-react';

interface Comment {
  id: number;
  memoId: number;
  dealId: number;
  userId: number;
  text: string;
  createdAt: string;
  user?: {
    id: number;
    fullName: string;
    initials: string;
    avatarColor: string;
    role: string;
  };
}

interface MemoDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  memo: any;
  dealId: number;
}

export function MemoDetailDialog({ isOpen, onOpenChange, memo, dealId }: MemoDetailDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch comments when memo is opened
  useEffect(() => {
    if (isOpen && memo?.id) {
      fetchComments();
    }
  }, [isOpen, memo?.id]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/deals/${dealId}/memos/${memo.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      } else {
        // If the endpoint doesn't exist yet, use empty array
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      setIsSubmitting(true);
      
      // Send the comment to the API
      await apiRequest('POST', `/api/deals/${dealId}/memos/${memo.id}/comments`, {
        text: newComment,
        userId: user?.id,
        dealId: dealId,
        memoId: memo.id
      });
      
      // Add comment to local state (optimistic update)
      const newCommentObj: Comment = {
        id: Date.now(), // Temporary ID until we refresh
        memoId: memo.id,
        dealId: dealId,
        userId: user?.id || 0,
        text: newComment,
        createdAt: new Date().toISOString(),
        user: {
          id: user?.id || 0,
          fullName: user?.fullName || 'Anonymous',
          initials: user?.initials || user?.fullName?.substring(0, 2) || 'AN',
          avatarColor: user?.avatarColor || '#4338ca',
          role: user?.role || 'observer'
        }
      };
      
      setComments([...comments, newCommentObj]);
      setNewComment('');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
      
      toast({
        title: 'Comment added',
        description: 'Your comment has been added to the memo',
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Team Assessment Details</DialogTitle>
          <DialogDescription>
            View detailed assessment and add comments
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <MiniMemoDisplay memo={memo} expanded={true} />
        </div>
        
        <div className="mt-6">
          <CardHeader className="px-0 pt-0 pb-2">
            <CardTitle className="text-base flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              Comments
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0 space-y-4">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <Card key={comment.id} className="p-3 bg-slate-50">
                  <div className="flex items-start gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback 
                        className="text-xs" 
                        style={{ backgroundColor: comment.user?.avatarColor || '#4338ca', color: '#fff' }}
                      >
                        {comment.user?.initials || '--'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium">{comment.user?.fullName || 'Anonymous'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <p className="text-sm mt-1">{comment.text}</p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">No comments yet</p>
                <p className="text-xs mt-1">Be the first to comment on this assessment</p>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="px-0 pt-3 pb-0 flex flex-col items-stretch">
            <div className="mt-2 relative">
              <Textarea
                placeholder="Add your comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] pr-16"
              />
              <Button 
                size="sm" 
                onClick={handleSubmitComment} 
                disabled={isSubmitting || !newComment.trim()}
                className="absolute bottom-2 right-2"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="h-3 w-3 mr-1 animate-spin rounded-full border-b-2 border-white"></div>
                    <span>Posting...</span>
                  </div>
                ) : 'Post'}
              </Button>
            </div>
          </CardFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
