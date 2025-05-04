import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Download, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Set up worker URL for the PDF.js library
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  documentName: string;
}

export default function PDFViewer({ isOpen, onClose, documentId, documentName }: PDFViewerProps) {
  // State for the PDF document
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1.0);
  
  // Reset state when opening a new document
  useEffect(() => {
    if (isOpen) {
      setPageNumber(1);
      setLoading(true);
      setError(null);
      setScale(1.0);
    }
  }, [isOpen, documentId]);

  // Functions to handle document navigation
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load the PDF document. Please try downloading it instead.');
    setLoading(false);
  };

  const previousPage = () => {
    setPageNumber(prevPageNumber => Math.max(prevPageNumber - 1, 1));
  };

  const nextPage = () => {
    if (numPages) {
      setPageNumber(prevPageNumber => Math.min(prevPageNumber + 1, numPages));
    }
  };

  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.2, 2.5));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{documentName}</DialogTitle>
          <DialogDescription>
            {numPages ? `Page ${pageNumber} of ${numPages}` : 'Loading document...'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto bg-neutral-50 rounded-md relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-sm text-neutral-500">Loading document...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center text-center p-6">
                <p className="text-red-500">{error}</p>
                <Button 
                  asChild 
                  className="mt-4"
                >
                  <a href={`/api/documents/${documentId}/download`} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download Document
                  </a>
                </Button>
              </div>
            </div>
          )}
          
          {/* Fallback to embed if browser doesn't support the react-pdf component */}
          <div className="pdf-document flex justify-center p-4">
            <Document
              file={`/api/documents/${documentId}/download`}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<Skeleton className="h-[800px] w-[600px]" />}
              error={null}
              noData={null}
            >
              <Page 
                pageNumber={pageNumber} 
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={<Skeleton className="h-[800px] w-[600px]" />}
                className="pdf-page"
              />
            </Document>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={zoomOut}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={zoomIn}
              disabled={scale >= 2.5}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={previousPage}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center text-sm px-2">
              {pageNumber} / {numPages || '-'}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={nextPage}
              disabled={!numPages || pageNumber >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button asChild>
              <a href={`/api/documents/${documentId}/download`} target="_blank" rel="noopener noreferrer">
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
