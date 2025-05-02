import React, { useState } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, BarChart2, Mail, PhoneCall, FileText, Download, Edit, Trash2, Info } from 'lucide-react';
import DealForm from '@/components/deals/DealForm';
import { Deal, DealStageLabels, Document } from '@shared/schema';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

const DealDetail = () => {
  const [, navigate] = useLocation();
  const { dealId } = useParams<{ dealId: string }>();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  // Deal data
  const {
    data: deal,
    isLoading,
    error,
  } = useQuery({
    queryKey: [`/api/deals/${dealId}`],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}`);
      if (!res.ok) {
        throw new Error('Failed to load deal');
      }
      return res.json();
    },
  });

  // Deal documents query
  const { data: documents } = useQuery({
    queryKey: [`/api/deals/${dealId}/documents`],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/documents`);
      if (!res.ok) {
        throw new Error('Failed to load documents');
      }
      return res.json();
    },
    enabled: !!dealId,
  });

  // Time events query
  const { data: timelineEvents } = useQuery({
    queryKey: [`/api/deals/${dealId}/timeline`],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/timeline`);
      if (!res.ok) {
        throw new Error('Failed to load timeline');
      }
      return res.json();
    },
    enabled: !!dealId,
  });

  // Edit deal mutation
  const updateDealMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest(
        'PATCH',
        `/api/deals/${dealId}`,
        undefined,
        null,
        formData
      );
      return res.json();
    },
    onSuccess: () => {
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/documents`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/timeline`] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({
        title: 'Success',
        description: 'Deal updated successfully',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to update deal: ${error.message || 'Unknown error'}`,
      });
    },
  });

  // Delete deal mutation
  const deleteDealMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        'DELETE',
        `/api/deals/${dealId}`
      );
      return res.ok;
    },
    onSuccess: () => {
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      navigate('/pipeline');
      toast({
        title: 'Success',
        description: 'Deal deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to delete deal: ${error.message || 'Unknown error'}`,
      });
    },
  });

  const handleEditSubmit = (formData: any, file?: File) => {
    const submitData = new FormData();
    
    // Add form fields to FormData
    Object.entries(formData).forEach(([key, value]) => {
      submitData.append(key, String(value));
    });
    
    // Add file if provided
    if (file) {
      submitData.append('pitchDeck', file);
    }
    
    updateDealMutation.mutate(submitData);
  };

  const handleDeleteConfirm = () => {
    deleteDealMutation.mutate();
  };

  const getPitchDeck = (): Document | undefined => {
    if (!documents) return undefined;
    return documents.find((doc: Document) => doc.documentType === 'pitch_deck');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-xl font-semibold mb-2">Error Loading Deal</h2>
        <p className="text-muted-foreground mb-4">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
        <Button asChild>
          <Link href="/pipeline">Return to Pipeline</Link>
        </Button>
      </div>
    );
  }

  const pitchDeck = getPitchDeck();

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex flex-col lg:flex-row justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold truncate">{deal.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <Badge variant="outline" className="font-medium">
              {deal.sector}
            </Badge>
            <Badge 
              variant={deal.stage === 'rejected' ? 'destructive' : deal.stage === 'invested' ? 'success' : 'secondary'}
              className="font-medium"
            >
              {DealStageLabels[deal.stage]}
            </Badge>
            {deal.callTarget && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                <PhoneCall className="h-3.5 w-3.5 mr-1" />
                Call Target
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex gap-2" 
            onClick={() => setEditDialogOpen(true)}
          >
            <Edit className="h-4 w-4" />
            Edit Deal
          </Button>
          <Button 
            variant="outline" 
            className="flex gap-2 hover:bg-destructive hover:text-destructive-foreground" 
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{deal.description}</p>
                </CardContent>
              </Card>
              
              {deal.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{deal.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Deal Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  {documents && documents.length > 0 ? (
                    <ul className="divide-y">
                      {documents.map((doc: Document) => (
                        <li key={doc.id} className="py-3 flex justify-between items-center">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{doc.fileName}</p>
                              <p className="text-sm text-muted-foreground">
                                {doc.documentType === 'pitch_deck' ? 'Pitch Deck' : doc.documentType} • 
                                {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <Button asChild size="sm" variant="ghost">
                            <a href={`/api/documents/${doc.id}/download`} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </a>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p>No documents available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Deal Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {timelineEvents && timelineEvents.length > 0 ? (
                    <ol className="relative border-l border-gray-200 dark:border-gray-700">
                      {timelineEvents.map((event: any) => (
                        <li key={event.id} className="mb-6 ml-4">
                          <div className="absolute w-3 h-3 bg-primary rounded-full mt-1.5 -left-1.5"></div>
                          <time className="mb-1 text-sm font-normal text-muted-foreground">
                            {format(new Date(event.createdAt), 'MMM d, yyyy \at h:mm a')}
                          </time>
                          <h3 className="text-md font-semibold">
                            {event.eventType === 'stage_change' && 'Stage Change'}
                            {event.eventType === 'note' && 'Note Added'}
                            {event.eventType === 'document_upload' && 'Document Uploaded'}
                            {event.eventType === 'memo_added' && 'Memo Added'}
                            {event.eventType === 'star_added' && 'Deal Starred'}
                          </h3>
                          {event.content && <p className="mt-1 whitespace-pre-wrap">{event.content}</p>}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p>No timeline events yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar with deal details/metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Deal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Projected Return</h3>
                <p className="font-semibold">{deal.projectedReturn}x</p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Contact Email</h3>
                <p className="font-medium break-all">
                  <a href={`mailto:${deal.contactEmail}`} className="hover:underline flex items-center">
                    <Mail className="h-3.5 w-3.5 mr-1" />
                    {deal.contactEmail}
                  </a>
                </p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Stage</h3>
                <Badge 
                  variant={deal.stage === 'rejected' ? 'destructive' : deal.stage === 'invested' ? 'success' : 'secondary'}
                  className="font-medium mt-1"
                >
                  {DealStageLabels[deal.stage]}
                </Badge>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Created</h3>
                <p className="font-medium">
                  {format(new Date(deal.createdAt), 'MMM d, yyyy')}
                </p>
              </div>
              
              {pitchDeck && (
                <>
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Pitch Deck</h3>
                    <Button asChild variant="outline" className="w-full">
                      <a href={`/api/documents/${pitchDeck.id}/download`} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download Pitch Deck
                      </a>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* We could add more cards here for things like team members, related deals, etc. */}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
            <DialogDescription>
              Make changes to the deal information below.
            </DialogDescription>
          </DialogHeader>
          <DealForm 
            initialData={deal} 
            onSubmit={handleEditSubmit} 
            isSubmitting={updateDealMutation.isPending}
            error={updateDealMutation.error?.message}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Deal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this deal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 mt-4">
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={deleteDealMutation.isPending}
            >
              {deleteDealMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>Delete Deal</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealDetail;
