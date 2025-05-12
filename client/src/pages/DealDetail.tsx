import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { usePermissions } from "@/hooks/use-permissions";
import AppLayout from "@/components/layout/AppLayout";
import TimelineSimplified from "@/components/deals/TimelineSimplified";
import EditDealModal from "@/components/deals/EditDealModal";
import AssignUserModal from "@/components/deals/AssignUserModal";
import AllocateFundModal from "@/components/deals/AllocateFundModal";
import StageProgression from "@/components/deals/StageProgression";
import DocumentList from "@/components/documents/DocumentList";
import { MiniMemoForm } from "@/components/memos/MiniMemoForm";
import { MiniMemoDisplay } from "@/components/memos/MiniMemoDisplay";
import { MemoDetailDialog } from "@/components/memos/MemoDetailDialog";
import { CreateCapitalCallForm } from "@/components/capitalcalls/CreateCapitalCallForm";
import CapitalCallsList from "@/components/capitalcalls/CapitalCallsList";
import AiAnalysisSection from "@/components/deal-detail/AiAnalysisSection";
import { UserAvatar } from "@/components/common/UserAvatar";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DEAL_STAGES } from "@/lib/constants/deal-constants";
import type { Deal, MiniMemo } from "@shared/schema";
import { 
  CalendarIcon, 
  Users, 
  UserPlus, 
  DollarSign, 
  Star, 
  Pencil, 
  FileText,
  MoreHorizontal,
  AlertTriangle,
  Info as InfoIcon,
  CheckCircle2,
  MessageSquare,
  ListTodo,
  BookOpen
} from "lucide-react";
import { enrichDealWithComputedProps } from "@/lib/deal-utils";

export default function DealDetail() {
  const [, params] = useRoute("/deals/:id");
  const [, setLocation] = useLocation();
  const dealId = params?.id;
  
  // State for modals and dialogs
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [selectedMemoId, setSelectedMemoId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  
  const { toast } = useToast();
  const { data: user } = useAuth();
  const { hasPermission } = usePermissions();
  
  // If no deal ID is provided, redirect to pipeline
  if (!dealId || isNaN(parseInt(dealId))) {
    setTimeout(() => {
      setLocation("/pipeline");
    }, 0);
    return <AppLayout><div className="p-6">Redirecting...</div></AppLayout>;
  }
  
  const { data: rawDeal, isLoading, refetch } = useQuery<Deal>({
    queryKey: [`/api/deals/${dealId}`],
    enabled: !!dealId,
  });
  
  // Apply computed properties to deal data
  const deal = rawDeal ? enrichDealWithComputedProps(rawDeal) : undefined;
  
  // Get the stars for this deal to check if current user has starred it
  const { data: stars = [] } = useQuery({
    queryKey: [`/api/deals/${dealId}/stars`],
    enabled: !!dealId
  });
  
  // Get the current user info
  const { data: currentUser } = useAuth();
  
  // Check if current user has already starred this deal
  const hasUserStarred = Array.isArray(stars) && stars.some((star: any) => currentUser && star.userId === currentUser.id);
  
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
      await queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
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
  
  const starDealMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/deals/${dealId}/stars`);
    },
    onSuccess: async () => {
      toast({
        title: "Deal starred",
        description: "Deal has been added to your favorites."
      });
      await queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/stars`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to star deal. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const unstarDealMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/deals/${dealId}/stars`);
    },
    onSuccess: async () => {
      toast({
        title: "Deal unstarred",
        description: "Deal has been removed from your favorites."
      });
      await queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/stars`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unstar deal. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const deleteDealMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/deals/${dealId}`);
    },
    onSuccess: () => {
      toast({
        title: "Deal deleted",
        description: "The deal has been permanently deleted."
      });
      setLocation("/pipeline");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the deal. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote);
  };
  
  const handleStarToggle = () => {
    if (hasUserStarred) {
      unstarDealMutation.mutate();
    } else {
      starDealMutation.mutate();
    }
  };
  
  const handleDeleteDeal = () => {
    deleteDealMutation.mutate();
  };
  
  const handleViewMemo = (memoId: number) => {
    setSelectedMemoId(memoId);
  };

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-40 bg-gray-200 rounded mb-6"></div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  // Error state - deal not found
  if (!deal) {
    return (
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Deal Not Found</h2>
            <p className="text-neutral-500 mb-6">The deal you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => setLocation("/pipeline")}>
              Return to Pipeline
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className={cn(
                "font-medium text-xs",
                deal.stage === 'initial_review' && "bg-amber-500",
                deal.stage === 'screening' && "bg-blue-500",
                deal.stage === 'diligence' && "bg-purple-500",
                deal.stage === 'ic_review' && "bg-indigo-500",
                deal.stage === 'approved' && "bg-success",
                deal.stage === 'rejected' && "bg-destructive",
                deal.stage === 'closing' && "bg-green-600",
                deal.stage === 'closed' && "bg-primary",
                deal.stage === 'invested' && "bg-primary-dark",
                deal.stage === 'ai_review' && "bg-accent",
              )}>
                {deal.stageLabel}
              </Badge>
              
              <Badge variant="outline" className="font-normal text-xs">
                {deal.sector}
              </Badge>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-semibold">{deal.name}</h1>
            
            <div className="flex items-center gap-4 mt-2 text-sm">
              <div className="text-neutral-600 flex items-center">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                Created {format(new Date(deal.createdAt), 'MMM d, yyyy')}
              </div>
              
              {deal.assignedUsers && deal.assignedUsers.length > 0 && (
                <div className="flex items-center -space-x-2">
                  {deal.assignedUsers.map((userId: number) => (
                    <Avatar key={userId} className="h-6 w-6 border-2 border-background">
                      <AvatarFallback className="text-[10px]">
                        {/* Placeholder - should come from user data */}
                        {userId.toString().substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 self-end sm:self-auto">
            <Button 
              variant={hasUserStarred ? "default" : "outline"}
              size="sm"
              onClick={handleStarToggle}
              className={hasUserStarred ? "bg-amber-500 hover:bg-amber-600" : ""}
            >
              <Star className="h-4 w-4 mr-1" />
              {hasUserStarred ? 'Starred' : 'Star'}
            </Button>
            
            {hasPermission('deals', 'update') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                
                {hasPermission('deals', 'update') && (
                  <>
                    <DropdownMenuItem onClick={() => setAssignModalOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign Team Members
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => setAllocateModalOpen(true)}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Allocate to Fund
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                  </>
                )}
                
                {hasPermission('deals', 'delete') && (
                  <>
                    <DropdownMenuItem 
                      className="text-red-500 focus:text-red-500"
                      onClick={() => setDeleteConfirmOpen(true)}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Delete Deal
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Deal description */}
        <div className="mb-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <p className="text-sm">{deal.description}</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Stage progression visualization */}
        <div className="mb-6">
          <StageProgression currentStage={deal.stage} />
        </div>
        
        {/* Main content tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger value="overview" className="text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4 flex-1">
              Overview
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4 flex-1">
              Documents
            </TabsTrigger>
            <TabsTrigger value="assessment" className="text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4 flex-1">
              Assessment
            </TabsTrigger>
            <TabsTrigger value="capital" className="text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4 flex-1">
              Capital Calls
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4 flex-1">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4 flex-1">
              AI Analysis
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-xl">Deal Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Deal details go here */}
                  <dl className="space-y-4 text-sm">
                    <div className="grid grid-cols-3 gap-1">
                      <dt className="font-medium text-neutral-500">Target Return:</dt>
                      <dd className="col-span-2">{deal.targetReturn || 'Not specified'}</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <dt className="font-medium text-neutral-500">Stage:</dt>
                      <dd className="col-span-2">{deal.stageLabel}</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <dt className="font-medium text-neutral-500">Contact Email:</dt>
                      <dd className="col-span-2">{deal.contactEmail || 'Not provided'}</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <dt className="font-medium text-neutral-500">Created:</dt>
                      <dd className="col-span-2">{format(new Date(deal.createdAt), 'MMMM d, yyyy')}</dd>
                    </div>
                    {deal.updatedAt && (
                      <div className="grid grid-cols-3 gap-1">
                        <dt className="font-medium text-neutral-500">Last Updated:</dt>
                        <dd className="col-span-2">{format(new Date(deal.updatedAt), 'MMMM d, yyyy')}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-xl">Team & Collaboration</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Team assignment info here */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Assigned Team Members</h4>
                      {deal.assignedUsers && deal.assignedUsers.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {deal.assignedUsers.map((userId: number) => (
                            <div key={userId} className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-secondary">
                              User #{userId}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-500">No team members assigned yet</p>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Deal Activity</h4>
                      <div className="text-sm text-neutral-500">
                        {deal.starCount} stars • Last activity: {formatDistanceToNow(new Date(deal.updatedAt || deal.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    
                    {hasPermission('deals', 'update') && (
                      <div className="flex flex-wrap gap-2 mt-6">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setAssignModalOpen(true)}
                          className="flex-1"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assign
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setAllocateModalOpen(true)}
                          className="flex-1"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Allocate
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="documents">
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-xl">Document Repository</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Manage documents related to this deal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentList
                  dealId={deal.id}
                  onUpdate={() => refetch()}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-xl">Timeline & Notes</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    History of activity and communication for this deal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TimelineSimplified dealId={deal?.id} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="assessment">
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-xl">Team Assessment</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Collaborative evaluations from team members to support decision-making
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm bg-muted/50 p-4 rounded-md mb-4">
                  <InfoIcon className="h-4 w-4 inline-block mr-2" />
                  Team members can submit individual assessments for collaborative evaluation.
                </div>
                
                {/* Add button to create a new memo */}
                <div className="flex justify-end">
                  <MiniMemoForm
                    dealId={deal.id}
                    onSubmit={() => refetch()}
                    buttonLabel="Add Team Assessment"
                    buttonVariant="outline"
                    buttonSize="sm"
                    buttonIcon={<Users className="h-3.5 w-3.5 mr-1.5" />}
                  />
                </div>
                
                {/* Loop through deal's mini memos but display as multiple cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deal.miniMemos?.map((memo: MiniMemo) => (
                    <Card key={memo.id} className="overflow-hidden border">
                      <CardHeader className="p-4 pb-2 bg-secondary/10">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="font-semibold text-sm">
                              {memo.title || 'Untitled Assessment'}
                            </div>
                            <div className="text-xs text-neutral-500 flex items-center gap-2">
                              <div className="flex items-center">
                                <UserAvatar user={{ 
                                  id: memo.createdBy,
                                  fullName: memo.createdByName || 'Unknown',
                                  initials: memo.createdByInitials || 'XX',
                                  avatarColor: memo.createdByColor || '#9c9c9c'
                                }} size="xs" />
                                <span className="ml-1">{memo.createdByName}</span>
                              </div>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(memo.createdAt), { addSuffix: true })}</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <div className="text-sm line-clamp-3 mb-3">
                          {memo.content}
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex gap-2">
                            <Badge variant="outline" className="font-normal text-xs">
                              {memo.category || 'General'}
                            </Badge>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleViewMemo(memo.id)}>
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Show message when no memos */}
                {(!deal.miniMemos || deal.miniMemos.length === 0) && (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-1">No Assessments Yet</h3>
                    <p className="text-neutral-500 mb-6 max-w-sm mx-auto">
                      Team assessments help provide different perspectives and evaluation criteria for this deal.
                    </p>
                    <MiniMemoForm
                      dealId={deal.id}
                      onSubmit={() => refetch()}
                      buttonLabel="Create First Assessment"
                      buttonIcon={<Users className="h-4 w-4 mr-2" />}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="capital">
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-xl">Capital Calls</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Manage capital calls and track funding status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <CreateCapitalCallForm dealId={deal.id} onSuccess={() => refetch()} />
                </div>
                
                <CapitalCallsList dealId={deal.id} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="ai">
            <AiAnalysisSection dealId={deal.id} />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Modals */}
      <EditDealModal 
        deal={deal}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={() => {
          setEditModalOpen(false);
          refetch();
        }}
      />
      
      <AssignUserModal 
        dealId={deal.id}
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onAssigned={() => {
          setAssignModalOpen(false);
          refetch();
        }}
      />
      
      <AllocateFundModal 
        dealId={deal.id}
        isOpen={allocateModalOpen}
        onClose={() => setAllocateModalOpen(false)}
        onAllocated={() => {
          setAllocateModalOpen(false);
          refetch();
        }}
      />
      
      {selectedMemoId && (
        <MemoDetailDialog 
          memoId={selectedMemoId}
          onClose={() => setSelectedMemoId(null)}
        />
      )}
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this deal and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDeal} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}