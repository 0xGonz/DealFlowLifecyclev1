import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Download, Trash2, FileUp, File, Eye } from 'lucide-react';
import { Document } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { formatBytes } from '@/lib/utils/format';
import PDFViewer from './PDFViewer';
import EmbeddedPDFViewer from './EmbeddedPDFViewer';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DocumentListProps {
  dealId: number;
}

export default function DocumentList({ dealId }: DocumentListProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('pitch_deck');
  const [description, setDescription] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: [`/api/documents/deal/${dealId}`],
    enabled: !!dealId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/documents/upload', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/deal/${dealId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
      toast({
        title: 'Document uploaded',
        description: 'Your document has been successfully uploaded.',
      });
      setIsUploadDialogOpen(false);
      setUploadingFile(null);
      setDescription('');
    },
    onError: () => {
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your document. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return apiRequest('DELETE', `/api/documents/${documentId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/deal/${dealId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
      toast({
        title: 'Document deleted',
        description: 'The document has been successfully deleted.',
      });
    },
    onError: () => {
      toast({
        title: 'Delete failed',
        description: 'There was an error deleting your document. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadingFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!uploadingFile) return;

    // Instead of FormData, let's use a regular JSON object since our server expects JSON
    const uploadData = {
      fileName: uploadingFile.name,
      fileType: uploadingFile.type,
      fileSize: uploadingFile.size,
      dealId: dealId.toString(),
      documentType,
      uploadedBy: '1', // Admin user ID (only ID 1 exists in the database)
      description: description || null
    };

    uploadMutation.mutate(uploadData);
  };

  const getDocumentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'pitch_deck': 'Pitch Deck',
      'financial_model': 'Financial Model',
      'legal_document': 'Legal Document',
      'diligence_report': 'Diligence Report',
      'investor_update': 'Investor Update',
      'other': 'Other'
    };
    return types[type] || type;
  };

  const getDocumentTypeIcon = (type: string, className = 'h-10 w-10') => {
    // Default icon
    return <FileText className={className} />;
  };
  
  const handleViewDocument = (document: Document) => {
    if (document.fileType === 'application/pdf' || document.fileName.toLowerCase().endsWith('.pdf')) {
      setSelectedDocument(document);
      setIsPdfViewerOpen(true);
    } else {
      // For non-PDF documents, just download them
      window.open(`/api/documents/${document.id}/download`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-40 w-full bg-neutral-100 rounded-lg mb-4"></div>
        <div className="h-40 w-full bg-neutral-100 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium">All Documents</h3>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <FileUp className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Upload a document related to this deal. Supported formats include PDF, DOC, DOCX, XLS, XLSX, and more.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="documentType">Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger id="documentType">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pitch_deck">Pitch Deck</SelectItem>
                    <SelectItem value="financial_model">Financial Model</SelectItem>
                    <SelectItem value="legal_document">Legal Document</SelectItem>
                    <SelectItem value="diligence_report">Diligence Report</SelectItem>
                    <SelectItem value="investor_update">Investor Update</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea 
                  id="description" 
                  placeholder="Add a description for this document"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="file">File</Label>
                <div className="mt-1">
                  {uploadingFile ? (
                    <div className="flex items-center justify-between border p-3 rounded-md">
                      <div className="flex items-center">
                        <File className="h-5 w-5 text-blue-500 mr-2" />
                        <span className="text-sm truncate">{uploadingFile.name}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setUploadingFile(null)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-center p-6 border border-dashed rounded-md cursor-pointer"
                         onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="text-center">
                        <FileUp className="h-10 w-10 text-neutral-400 mx-auto mb-2" />
                        <p className="text-sm font-medium">Click to select or drop a file</p>
                        <p className="text-xs text-neutral-500 mt-1">PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, etc.</p>
                      </div>
                    </div>
                  )}
                  <input 
                    id="file" 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleUpload} 
                disabled={!uploadingFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {documents && documents.length > 0 ? (
        <div className="space-y-8">
          {/* Display latest pitch deck document at the top if it exists */}
          {documents.some(doc => doc.documentType === 'pitch_deck') && (
            <div className="mb-8">
              {/* Get the latest pitch deck document */}
              {(() => {
                const pitchDecks = documents.filter(doc => doc.documentType === 'pitch_deck');
                if (pitchDecks.length > 0) {
                  // Sort by date and get the most recent pitch deck
                  const latestPitchDeck = pitchDecks.sort((a, b) => 
                    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
                  )[0];
                  return (
                    <Card className="w-full">
                      <CardContent className="p-6">
                        <EmbeddedPDFViewer 
                          documentId={latestPitchDeck.id} 
                          documentName={latestPitchDeck.fileName} 
                        />
                      </CardContent>
                    </Card>
                  );
                }
                return null;
              })()}
            </div>
          )}
          
          {/* Document list */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {documents.map((document) => (
              <Card className="p-4 flex" key={document.id}>
                <div className="mr-4 flex-shrink-0 flex items-center justify-center bg-neutral-100 p-3 rounded-lg">
                  {getDocumentTypeIcon(document.documentType)}
                </div>
                <div className="flex-grow overflow-hidden">
                  <h4 className="font-medium text-neutral-800 truncate">{document.fileName}</h4>
                  <p className="text-sm text-neutral-500 mb-2">
                    {getDocumentTypeLabel(document.documentType)} • {formatBytes(document.fileSize)}
                  </p>
                  {document.description && (
                    <p className="text-sm text-neutral-600 mb-2 line-clamp-2">{document.description}</p>
                  )}
                  <p className="text-xs text-neutral-400">
                    Uploaded {formatDistanceToNow(new Date(document.uploadedAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex flex-col justify-center space-y-2 ml-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleViewDocument(document)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/api/documents/${document.id}/download`} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </a>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this document and cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(document.id)}
                        >
                          {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-neutral-500 bg-white rounded-lg shadow-sm">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No documents uploaded yet.</p>
          <Button 
            className="mt-4" 
            onClick={() => setIsUploadDialogOpen(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      )}
      
      {/* PDF Viewer */}
      {selectedDocument && (
        <PDFViewer
          isOpen={isPdfViewerOpen}
          onClose={() => setIsPdfViewerOpen(false)}
          documentId={selectedDocument.id}
          documentName={selectedDocument.fileName}
        />
      )}
    </div>
  );
}