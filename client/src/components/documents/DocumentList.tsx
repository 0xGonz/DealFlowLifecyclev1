import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Download, Trash2, FileUp, File, Eye } from 'lucide-react';
import { Document } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { formatBytes } from '@/lib/utils/format';
import PDFViewer from './PDFViewer'; // Import our updated PDFViewer component
import EmbeddedPDFViewer from './EmbeddedPDFViewer';
// Import react-pdf components
import { Document as PDFDocument, Page as PDFPage } from 'react-pdf';
// Import PDF utilities
import { checkFileExists } from '@/lib/pdf-config';
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
  
  // PDF worker is already configured in main.tsx
  // No need for initialization here
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: [`/api/documents/deal/${dealId}`],
    enabled: !!dealId,
  });
  
  // Set the selected document when documents are loaded and none is selected yet
  useEffect(() => {
    if (documents && documents.length > 0 && !selectedDocument) {
      setSelectedDocument(documents[0]);
    }
  }, [documents, selectedDocument]);

  // Document uploads use the native fetch API with FormData directly
  // instead of using the query client, since we need to send files

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
  
  // Drag and drop event handlers
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('bg-neutral-50', 'border-blue-300');
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('bg-neutral-50', 'border-blue-300');
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('bg-neutral-50', 'border-blue-300');
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Only take the first file if multiple files are dropped
      setUploadingFile(e.dataTransfer.files[0]);
      
      // Log for debugging
      console.log('File dropped:', e.dataTransfer.files[0].name);
    }
  }, []);

  const handleUpload = async () => {
    if (!uploadingFile) return;

    // Create FormData for file upload - this matches the multer implementation on the server
    const formData = new FormData();
    // The key 'file' must match the multer field name in upload.single('file')
    formData.append('file', uploadingFile);
    formData.append('dealId', dealId.toString());
    formData.append('documentType', documentType);
    // Will use the authenticated user's ID from the session in the backend
    if (description) {
      formData.append('description', description);
    }

    // Show loading state
    const uploadingToast = toast({
      title: 'Uploading document',
      description: 'Please wait while your document is being uploaded...',
    });

    // Use a direct fetch call instead of apiRequest for FormData upload
    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error('Failed to upload document');
      }
      
      // Handle success
      queryClient.invalidateQueries({ queryKey: [`/api/documents/deal/${dealId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
      toast({
        title: 'Document uploaded',
        description: 'Your document has been successfully uploaded.',
      });
      setIsUploadDialogOpen(false);
      setUploadingFile(null);
      setDescription('');
    } catch (error) {
      console.error('Document upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your document. Please try again.',
        variant: 'destructive',
      });
    }
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
    // Just set the selected document, don't open any pop-up
    setSelectedDocument(document);
    
    // Don't open the PDF viewer modal or download the file
    // The document will be displayed in the iframe below
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-40 w-full bg-neutral-100 rounded-lg mb-4"></div>
        <div className="h-40 w-full bg-neutral-100 rounded-lg"></div>
      </div>
    );
  }
  
  // Better handling of no documents case
  if (!documents || documents.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium">Documents</h3>
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <FileUp className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            {/* Upload Dialog content - same as in the main return statement */}
            {/* This is duplicated for simplicity */}
            <DialogContent>{/* Dialog content here */}</DialogContent>
          </Dialog>
        </div>
        
        <div className="flex flex-col items-center justify-center p-8 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
          <FileText className="h-16 w-16 text-neutral-300 mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No Documents</h3>
          <p className="text-sm text-neutral-500 text-center mb-4 max-w-md">
            There are no documents associated with this deal yet. 
            Upload documents like pitch decks, financial models, 
            or legal documents to keep everything organized.
          </p>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <FileUp className="h-4 w-4 mr-2" />
            Upload First Document
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium">Documents</h3>
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
                    <div 
                      className="flex justify-center p-6 border border-dashed rounded-md cursor-pointer transition-colors duration-200"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
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
                disabled={!uploadingFile}
              >
                Upload Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {documents && documents.length > 0 ? (
        <div>
          {/* Document list - compact view */}
          <div>
            <h3 className="text-sm font-medium mb-2">All Documents</h3>
            <div className="grid gap-2 grid-cols-1">
              {documents.map((document) => (
                <div 
                  key={document.id} 
                  className={`flex justify-between items-center p-2 rounded border cursor-pointer ${
                    selectedDocument?.id === document.id 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-neutral-50'
                  }`}
                  onClick={() => handleViewDocument(document)}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="mr-2 flex-shrink-0 flex items-center justify-center bg-neutral-100 p-1.5 rounded">
                      {getDocumentTypeIcon(document.documentType, 'h-4 w-4')}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-medium truncate">{document.fileName}</p>
                      <p className="text-xs text-neutral-500 truncate">
                        {getDocumentTypeLabel(document.documentType)} • {formatBytes(document.fileSize)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
                      <a 
                        href={`/api/documents/${document.id}/download`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
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
                </div>
              ))}
            </div>
          </div>
          
          {/* Display selected document or show "select a document" message */}
          <div className="mt-8">
            {selectedDocument ? (
              <div className="space-y-1">
                <div className="flex justify-between items-center h-8 px-1">
                  <div className="text-xs text-neutral-500 truncate flex-1">
                    {selectedDocument.fileName}
                  </div>
                  <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
                    <a href={`/api/documents/${selectedDocument.id}/download`} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
                
                <Card className="p-0 w-full overflow-hidden">
                  <div className="overflow-hidden h-[900px] bg-neutral-50 flex justify-center">
                    {selectedDocument.fileType === 'application/pdf' || 
                     selectedDocument.fileName.toLowerCase().endsWith('.pdf') ? (
                      <div className="w-full h-full">
                        <div id="pdf-viewer-container" className="w-full h-full">
                          <PDFDocument
                            file={`/api/documents/${selectedDocument.id}/download`}
                            onLoadError={(error) => {
                              console.error('Error loading PDF:', error);
                              // Switch to iframe fallback
                              const container = document.getElementById('pdf-viewer-container');
                              const fallback = document.getElementById('pdf-iframe-fallback');
                              
                              if (container && fallback) {
                                container.style.display = 'none';
                                fallback.style.display = 'block';
                              }
                              
                              toast({
                                title: 'Using simple document viewer',
                                description: 'PDF viewer could not be initialized. Using simple document viewer instead.',
                              });
                            }}
                            className="pdf-document w-full h-full"
                          >
                            <PDFPage
                              pageNumber={1}
                              renderAnnotationLayer={true}
                              renderTextLayer={true}
                              className="shadow-md"
                              width={800}
                            />
                          </PDFDocument>
                        </div>
                        <div id="pdf-iframe-fallback" style={{display: 'none'}} className="w-full h-full">
                          <iframe 
                            src={`/api/documents/${selectedDocument.id}/download`} 
                            className="w-full h-full border-0" 
                            title={selectedDocument.fileName}
                          />
                        </div>
                      </div>
                    ) : (
                      <iframe 
                        src={`/api/documents/${selectedDocument.id}/download`} 
                        className="w-full h-full border-0" 
                        title={selectedDocument.fileName}
                      />
                    )}
                  </div>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[900px] bg-neutral-50 rounded-lg border">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
                  <p className="text-sm text-neutral-500">Select a document to preview</p>
                </div>
              </div>
            )}
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
      
      {/* Modal PDF Viewer (for detailed view) */}
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