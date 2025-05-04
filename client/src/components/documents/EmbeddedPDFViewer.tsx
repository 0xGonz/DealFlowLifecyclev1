import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Document, Page, pdfjs } from 'react-pdf';
import { Skeleton } from '@/components/ui/skeleton';

// Use the same worker source as in PDFViewer component
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface EmbeddedPDFViewerProps {
  documentId: number;
  documentName: string;
}

export default function EmbeddedPDFViewer({ documentId, documentName }: EmbeddedPDFViewerProps) {
  // State for PDF rendering
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1.0);

  // Functions to handle document navigation
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading embedded PDF:', error);
    setError('Failed to load the document. Please try downloading it instead.');
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
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
          <div className="flex-1 mb-2 sm:mb-0">
            <h3 className="text-lg font-medium truncate">{documentName}</h3>
            {numPages && (
              <p className="text-sm text-neutral-500">
                Page {pageNumber} of {numPages}
              </p>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/documents/${documentId}/download`} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-1" />
                Download
              </a>
            </Button>
          </div>
        </div>
        
        <div className="border rounded-lg overflow-hidden h-[500px] bg-neutral-50 relative">
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
          
          <div className="pdf-document flex justify-center p-4 h-full">
            <Document
              file={`/api/documents/${documentId}/download`}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<Skeleton className="h-[450px] w-full" />}
              error={null}
              noData={null}
              className="flex justify-center"
            >
              <Page 
                pageNumber={pageNumber} 
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={<Skeleton className="h-[450px] w-[350px]" />}
                className="pdf-page"
              />
            </Document>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-2 border-t border-neutral-200">
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
        </div>
      </CardContent>
    </Card>
  );
}
