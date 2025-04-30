import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import Timeline from "@/components/deals/Timeline";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter
} from "@/components/ui/card";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft, 
  Star, 
  Edit, 
  Share2, 
  MessageSquare, 
  FileText, 
  Users, 
  DollarSign, 
  Building, 
  Calendar, 
  Mail,
  BarChart4
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function DealDetail() {
  const [match, params] = useRoute("/deals/:id");
  const [newNote, setNewNote] = useState("");
  
  const { toast } = useToast();
  
  const { data: deal, isLoading } = useQuery({
    queryKey: [`/api/deals/${params?.id}`],
    enabled: !!params?.id,
  });
  
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/deals/${params?.id}/timeline`, {
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
      await queryClient.invalidateQueries({ queryKey: [`/api/deals/${params?.id}`] });
      await queryClient.invalidateQueries({ queryKey: [`/api/deals/${params?.id}/timeline`] });
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
      return apiRequest("POST", `/api/deals/${params?.id}/star`, {});
    },
    onSuccess: async () => {
      toast({
        title: "Deal starred",
        description: "This deal has been added to your starred deals."
      });
      await queryClient.invalidateQueries({ queryKey: [`/api/deals/${params?.id}`] });
      await queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to star deal. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote);
  };
  
  const handleStarDeal = () => {
    starDealMutation.mutate();
  };
  
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 overflow-y-auto p-6 pb-20">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-neutral-200 rounded mb-4"></div>
            <div className="h-32 bg-white rounded-lg shadow-sm mb-6"></div>
            <div className="h-96 bg-white rounded-lg shadow-sm"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        {/* Back button and page title */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" className="mr-2" asChild>
            <a href="/pipeline">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Pipeline
            </a>
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-800">{deal?.name}</h1>
          
          <div className="ml-auto space-x-2">
            <Button variant="outline" onClick={handleStarDeal}>
              <Star className={`h-4 w-4 mr-2 ${deal?.starCount ? 'fill-accent text-accent' : ''}`} />
              {deal?.starCount ? `Starred (${deal.starCount})` : 'Star'}
            </Button>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Deal
            </Button>
          </div>
        </div>
        
        {/* Deal Overview Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <Badge className={`bg-${getDealStageColor(deal?.stage)} text-white mb-2`}>
                  {deal?.stageLabel}
                </Badge>
                <CardTitle>{deal?.name}</CardTitle>
                <CardDescription>{deal?.description}</CardDescription>
              </div>
              <div className="flex items-center">
                <div className="flex -space-x-2 mr-4">
                  {deal?.assignedUsers?.map(user => (
                    <Avatar key={user.id} className="border-2 border-white">
                      <AvatarFallback style={{ backgroundColor: user.avatarColor }}>
                        {user.initials}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Assign
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-neutral-500 mb-2">Deal Details</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Building className="h-4 w-4 text-neutral-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium">Industry</p>
                      <p className="text-sm text-neutral-600">{deal?.industry || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Users className="h-4 w-4 text-neutral-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium">Round</p>
                      <p className="text-sm text-neutral-600">{deal?.round || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <DollarSign className="h-4 w-4 text-neutral-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium">Target Raise</p>
                      <p className="text-sm text-neutral-600">{deal?.targetRaise || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-neutral-500 mb-2">Company Info</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Mail className="h-4 w-4 text-neutral-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium">Contact</p>
                      <p className="text-sm text-neutral-600">{deal?.contactEmail || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Users className="h-4 w-4 text-neutral-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium">Lead Investor</p>
                      <p className="text-sm text-neutral-600">{deal?.leadInvestor || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Calendar className="h-4 w-4 text-neutral-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium">Added</p>
                      <p className="text-sm text-neutral-600">
                        {formatDistanceToNow(new Date(deal?.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-neutral-500 mb-2">Evaluation</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <BarChart4 className="h-4 w-4 text-neutral-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium">Leaderboard Score</p>
                      <p className="text-sm text-neutral-600 font-semibold">{deal?.score || 'Not rated'}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Star className="h-4 w-4 text-neutral-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium">Stars</p>
                      <p className="text-sm text-neutral-600">{deal?.starCount || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <FileText className="h-4 w-4 text-neutral-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium">Mini-Memos</p>
                      <p className="text-sm text-neutral-600">{deal?.miniMemos?.length || 0} submitted</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Main content tabs */}
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="memos">Mini-Memos</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="allocation">Fund Allocation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Timeline & Notes</CardTitle>
                    <CardDescription>
                      History of activity and communication for this deal
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Timeline dealId={deal?.id} />
                  </CardContent>
                </Card>
              </div>
              
              <div className="md:col-span-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Add Note</CardTitle>
                    <CardDescription>
                      Add a note to the deal timeline
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea 
                      placeholder="Type your note here..." 
                      className="min-h-[150px]"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button 
                      onClick={handleAddNote}
                      disabled={addNoteMutation.isPending || !newNote.trim()}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="memos">
            <Card>
              <CardHeader>
                <CardTitle>Mini-Memos</CardTitle>
                <CardDescription>
                  Investment theses and evaluations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deal?.miniMemos?.length ? (
                  <div className="space-y-6">
                    {deal.miniMemos.map(memo => (
                      <div key={memo.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarFallback style={{ backgroundColor: memo.user?.avatarColor }}>
                                {memo.user?.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{memo.user?.fullName}</p>
                              <p className="text-xs text-neutral-500">{memo.user?.role}</p>
                            </div>
                          </div>
                          <Badge variant="outline">Score: {memo.score}</Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium">Investment Thesis</h4>
                            <p className="text-sm text-neutral-600">{memo.thesis}</p>
                          </div>
                          {memo.risksAndMitigations && (
                            <div>
                              <h4 className="text-sm font-medium">Risks & Mitigations</h4>
                              <p className="text-sm text-neutral-600">{memo.risksAndMitigations}</p>
                            </div>
                          )}
                          {memo.pricingConsideration && (
                            <div>
                              <h4 className="text-sm font-medium">Pricing Considerations</h4>
                              <p className="text-sm text-neutral-600">{memo.pricingConsideration}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No mini-memos have been submitted for this deal yet.</p>
                    <Button className="mt-4">
                      <FileText className="h-4 w-4 mr-2" />
                      Create Mini-Memo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>
                  Deal-related files and attachments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-neutral-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No documents uploaded yet.</p>
                  <Button className="mt-4">
                    <FileText className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="allocation">
            <Card>
              <CardHeader>
                <CardTitle>Fund Allocation</CardTitle>
                <CardDescription>
                  Allocate this deal to investment funds
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deal?.allocations?.length ? (
                  <div>
                    {/* Show allocations */}
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>This deal has not been allocated to any funds yet.</p>
                    <Button className="mt-4">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Allocate to Fund
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function getDealStageColor(stage: string): string {
  const stageColors: Record<string, string> = {
    initial_review: "neutral-500",
    screening: "neutral-500",
    due_diligence: "primary",
    ic_review: "info",
    closing: "success",
    closed: "success",
    passed: "destructive"
  };
  
  return stageColors[stage] || "neutral-500";
}
