import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileWarning } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import EnhancedPDFViewer from './EnhancedPDFViewer';

interface PDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  documentName: string;
}

export default function PDFViewer({ isOpen, onClose, documentId, documentName }: PDFViewerProps) {
  const [notFound, setNotFound] = useState(false);
  
  // Get file URL for enhanced PDF viewer
  const pdfFileUrl = `/api/documents/${documentId}/download`;
  
  // Handler for file not found errors
  const handleError = (error: Error) => {
    console.error('PDF viewer error:', error);
    // Check if it's a 404 error - backend will have already logged the details
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      setNotFound(true);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{documentName}</DialogTitle>
          <DialogDescription>
            View or download document
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto bg-neutral-50 rounded-md relative">
          {notFound ? (
            <Alert variant="destructive" className="m-4">
              <FileWarning className="h-4 w-4" />
              <AlertDescription>
                This document could not be found. It may have been deleted or moved.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="p-4 h-[70vh]">
              <EnhancedPDFViewer 
                file={pdfFileUrl} 
                title={documentName} 
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-end pt-4 border-t mt-4">
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button asChild disabled={notFound}>
              <a 
                href={pdfFileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => notFound && e.preventDefault()}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
