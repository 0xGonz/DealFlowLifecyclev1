import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useDocs, DocMeta } from '@/context/DocumentsContext';
import { FileUp, Trash2, FileText } from 'lucide-react';
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

export const Sidebar = ({ dealId }: { dealId: number }) => {
  const { docs, setDocs, current, setCurrent } = useDocs();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Mutation to upload a document
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dealId', dealId.toString());
      formData.append('documentType', 'document'); // Default document type
      
      const response = await fetch(`/api/documents/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        // Try to get more specific error message from the server
        const errorData = await response.json().catch(() => null);
        
        if (errorData && errorData.message) {
          throw new Error(errorData.message);
        } else if (errorData && errorData.error) {
          throw new Error(errorData.error);
        } else {
          throw new Error(`Failed to upload document (${response.status})`);
        }
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Convert API data to DocMeta format
      const docMeta: DocMeta = {
        id: data.id,
        name: data.fileName,
        downloadUrl: `/api/documents/${data.id}/download`,
      };
      
      // Add to docs state
      setDocs(prev => [...prev, docMeta]);
      
      // Set as current document if first one
      if (docs.length === 0) {
        setCurrent(docMeta);
      }
      
      toast({
        title: 'Document uploaded',
        description: `${data.fileName} was uploaded successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  // Mutation to delete a document
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      return id;
    },
    onSuccess: (id) => {
      // Remove from docs state
      setDocs((prev: DocMeta[]) => prev.filter((d: DocMeta) => d.id !== id));
      
      // If current doc was deleted, set to first available or null
      if (current?.id === id) {
        const remaining = docs.filter(d => d.id !== id);
        setCurrent(remaining.length > 0 ? remaining[0] : null);
      }
      
      toast({
        title: 'Document deleted',
        description: 'The document was deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) {
      toast({
        title: "Upload failed",
        description: "No file was detected. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if the file type is supported
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const supportedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
    
    if (!fileExt || !supportedExtensions.includes(fileExt)) {
      toast({
        title: "Unsupported file type",
        description: `Only ${supportedExtensions.join(', ')} files are supported. You tried to upload a ${fileExt || 'unknown'} file.`,
        variant: "destructive"
      });
      return;
    }
    
    // Upload the file
    uploadMutation.mutate(file);
  };

  // Prevent default to avoid browser opening the file
  // State to track when we're dragging over the drop zone
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDraggingOver) {
      setIsDraggingOver(true);
    }
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  return (
    <div 
      className={`p-4 h-full flex flex-col ${isDraggingOver ? 'bg-primary/10 border-2 border-dashed border-primary/50 rounded' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDragEnd={() => setIsDraggingOver(false)}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Documents</h3>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
          />
          <Button
            size="sm"
            onClick={handleUploadClick}
            aria-label="Upload new document"
            disabled={uploadMutation.isPending}
          >
            <FileUp className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto">
        {docs.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm p-4">
            No documents uploaded yet
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                role="button"
                aria-label={`View ${doc.name}`}
                className={`flex justify-between items-center p-2 rounded cursor-pointer ${
                  current?.id === doc.id
                    ? 'bg-secondary/50 border border-secondary'
                    : 'hover:bg-secondary/20'
                }`}
                onClick={() => setCurrent(doc)}
              >
                <div className="flex items-center overflow-hidden">
                  <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate text-sm">{doc.name}</span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      aria-label={`Delete document: ${doc.name}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete document?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this document. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(doc.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};