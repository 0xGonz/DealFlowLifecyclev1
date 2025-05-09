import React, { useState, useEffect } from 'react';
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
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Get file URL for enhanced PDF viewer
  const pdfFileUrl = `/api/documents/${documentId}/download`;
  
  // Check if the file exists first using a HEAD request
  useEffect(() => {
    if (isOpen) {
      fetch(pdfFileUrl, { method: 'HEAD' })
        .then(response => {
          if (!response.ok) {
            if (response.status === 404) {
              setNotFound(true);
              setLoadError("This document could not be found. It may have been deleted or moved.");
            } else {
              setLoadError(`Error accessing document (${response.status}). Please try downloading instead.`);
            }
          } else {
            setNotFound(false);
            setLoadError(null);
          }
        })
        .catch(error => {
          console.error('Error checking document existence:', error);
          setLoadError("Error accessing document. Please try downloading instead.");
        });
    }
  }, [pdfFileUrl, isOpen]);
  
  // Handler for various PDF errors - not just 404
  const handleError = (error: Error) => {
    console.error('PDF viewer error:', error);
    
    // Check if it's a 404 error - backend will have already logged the details
    if (error.message?.includes('404') || 
        error.message?.toLowerCase().includes('not found')) {
      setNotFound(true);
      setLoadError("This document could not be found. It may have been deleted or moved.");
    } else if (error.message?.toLowerCase().includes('failed to fetch') ||
              error.message?.toLowerCase().includes('network error')) {
      setLoadError("Network error loading document. Please try downloading instead.");
    } else if (error.message?.toLowerCase().includes('worker')) {
      setLoadError("PDF viewer initialization error. Please try downloading the file directly.");
    } else {
      setLoadError("Error displaying document. Please try downloading instead.");
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
          {loadError ? (
            <div className="space-y-4 m-4">
              <Alert variant={notFound ? "destructive" : "default"} className="mb-4">
                <FileWarning className="h-4 w-4" />
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
              
              <div className="text-center p-8">
                <Button asChild variant="outline" className="mx-auto">
                  <a 
                    href={pdfFileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    download={documentName}
                    onClick={(e) => notFound && e.preventDefault()}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Document
                  </a>
                </Button>
              </div>
            </div>
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
            <Button asChild>
              <a 
                href={pdfFileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                download={documentName}
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
