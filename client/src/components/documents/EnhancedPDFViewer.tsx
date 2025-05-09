import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, AlertCircle, FileWarning } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// PDF.js worker configuration is handled globally in pdf-config.ts
// This component focuses on rendering and error handling

interface PDFViewerProps {
  file: string | { data: ArrayBuffer };
  title?: string;
}

const EnhancedPDFViewer: React.FC<PDFViewerProps> = ({ file, title }) => {
  // State for the PDF viewer
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [useFallback, setUseFallback] = useState<boolean>(false);
  const [fileUrl, setFileUrl] = useState<string>('');

  // Convert file to URL if it's an ArrayBuffer
  useEffect(() => {
    if (typeof file === 'string') {
      setFileUrl(file);
    } else if (file && 'data' in file) {
      try {
        const blob = new Blob([file.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setFileUrl(url);
        
        // Clean up the URL when component unmounts
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.error('Error creating object URL from ArrayBuffer:', err);
        setError(err instanceof Error ? err : new Error('Failed to process PDF data'));
      }
    }
  }, [file]);

  // Function to handle successful document loading
  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
    setError(null);
  }

  // Function to handle document loading errors
  function onDocumentLoadError(err: Error) {
    console.error('Error loading PDF:', err);
    setError(err);
    setLoading(false);
    
    // If we're not already using the fallback, switch to it
    if (!useFallback) {
      console.log('Switching to fallback PDF rendering method');
      setUseFallback(true);
    }
  }

  // Page navigation functions
  function goToPrevPage() {
    setPageNumber(prevPageNumber => Math.max(prevPageNumber - 1, 1));
  }

  function goToNextPage() {
    setPageNumber(prevPageNumber => 
      Math.min(prevPageNumber + 1, numPages || 1)
    );
  }

  // Determine if buttons should be disabled
  const prevDisabled = pageNumber <= 1;
  const nextDisabled = numPages !== null && pageNumber >= numPages;

  // If there's an error and we're using the fallback, render iframe
  if (error && useFallback && fileUrl) {
    return (
      <div className="w-full h-full flex flex-col space-y-4">
        <Alert className="bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertTitle>Using simplified PDF viewer</AlertTitle>
          <AlertDescription>
            The advanced PDF viewer couldn't be loaded. Using browser's built-in viewer instead.
          </AlertDescription>
        </Alert>
        <iframe 
          src={fileUrl}
          className="w-full flex-grow rounded-md border shadow-sm min-h-[600px]"
          title={title || "PDF Document"}
        />
      </div>
    );
  }

  // If there's an error and we've tried the fallback (or can't use it), show error
  if (error && (!fileUrl || (useFallback && error))) {
    // Check for specific error types to give better messages
    let errorTitle = 'Error loading PDF';
    let errorMessage = error.message || 'The document could not be loaded. Please try again later.';
    
    // Handle 404 errors (file not found)
    if (error.message?.includes('404') || 
        error.message?.toLowerCase().includes('not found') ||
        error.message?.toLowerCase().includes('failed to fetch')) {
      errorTitle = 'Document not found';
      errorMessage = 'The file could not be found on the server. It may have been deleted or moved.';
    } 
    // Handle PDF.js worker errors
    else if (error.message?.includes('worker') || 
             error.message?.includes('pdf.worker')) {
      errorTitle = 'PDF viewer issue';
      errorMessage = 'There was a problem initializing the PDF viewer. Try downloading the document instead.';
    }
    
    return (
      <div className="space-y-4">
        <Alert variant="destructive" className="my-4">
          <FileWarning className="h-4 w-4" />
          <AlertTitle>{errorTitle}</AlertTitle>
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
        
        {/* Always show download option, even on error */}
        {typeof file === 'string' && (
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm">
              <a href={file} target="_blank" rel="noopener noreferrer" download>
                <Download className="h-4 w-4 mr-1" />
                Download PDF
              </a>
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Main PDF viewer using react-pdf
  return (
    <div className="w-full flex flex-col space-y-4">
      <div className="rounded-md border p-4 bg-white shadow-sm">
        {loading && (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {/* The Document component renders the PDF */}
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
          className="flex justify-center"
        >
          <Page 
            pageNumber={pageNumber} 
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="mx-auto"
          />
        </Document>
      </div>
      
      {/* Navigation controls */}
      {!loading && !error && numPages && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {pageNumber} of {numPages}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToPrevPage}
              disabled={prevDisabled}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToNextPage}
              disabled={nextDisabled}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedPDFViewer;