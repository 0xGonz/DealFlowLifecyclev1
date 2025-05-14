import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Document, Page } from 'react-pdf';
import { useDocs, DocMeta } from '@/context/DocumentsContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, RotateCw, FileText, X } from 'lucide-react';
import { getWorkerStatus } from '@/lib/setupPdfWorker';
import '@/styles/pdf-layers.css';

export const PdfViewer = () => {
  const { current, setDocs, setCurrent } = useDocs();
  const { toast } = useToast();
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Memoize PDF options to prevent unnecessary re-renders
  const pdfOptions = useMemo(() => ({
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/standard_fonts/',
  }), []);

  // Reset state when document changes
  useEffect(() => {
    if (current) {
      setPageNumber(1);
      setIsLoading(true);
      setError(null);
      setUseFallbackViewer(false);
      setRetryCount(0);
    }
  }, [current]);

  // Handle successful PDF load
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
    console.log(`PDF loaded successfully with ${numPages} pages`);
  }, []);

  // Retry loading with PDF.js
  const handleRetryPdfJs = useCallback(() => {
    if (!current) return;
    
    setIsLoading(true);
    setError(null);
    setUseFallbackViewer(false);
    setRetryCount(prev => prev + 1);
    
    // Log PDF worker status for debugging
    console.log('PDF Worker Status:', getWorkerStatus());
    
    toast({
      title: "Retrying PDF load",
      description: "Attempting to reload the document with PDF.js",
    });
  }, [current, toast]);

  // Switch to fallback iframe viewer
  const switchToFallbackViewer = useCallback(() => {
    setUseFallbackViewer(true);
    setIsLoading(false);
    
    toast({
      title: "Using fallback viewer",
      description: "Switched to basic document viewer for compatibility",
    });
  }, [toast]);

  // Handle PDF load errors
  const onDocumentLoadError = useCallback(async (err: Error) => {
    console.error('Error loading PDF:', err);
    setIsLoading(false);
    setError(err);
    
    // Check if this is a MissingPDFException or worker error
    const isMissingPdfError = 
      err.message?.toLowerCase().includes('missingpdfexception') || 
      (err as any)?.name === 'MissingPDFException' ||
      err.message?.includes('worker') ||
      err.message?.includes('Failed to fetch');
    
    // Log worker status to help with debugging
    const workerStatus = getWorkerStatus();
    console.log('PDF.js worker status:', workerStatus);
    
    if (current) {
      // First, verify the document exists and is accessible
      try {
        const response = await fetch(current.downloadUrl, { 
          method: 'HEAD', 
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.status === 404) {
          // Document is genuinely missing
          const notFoundError = new Error(
            'The document file could not be found. It may have been deleted or not properly saved.'
          );
          setError(notFoundError);
          
          toast({
            title: "Document Missing",
            description: "Document file not found on server. Please re-upload the document.",
            variant: "destructive"
          });
        } else if (response.ok) {
          // Document exists but PDF.js couldn't load it
          // Try the fallback viewer instead
          if (isMissingPdfError || retryCount >= 1) {
            toast({
              title: "Using Basic Viewer",
              description: "Document found but using more compatible viewer.",
            });
            switchToFallbackViewer();
          } else {
            // First failure, set error but offer retry
            setError(new Error("PDF viewer couldn't load the document. Try the fallback viewer or retry."));
            toast({
              title: "PDF Viewer Error",
              description: "Had trouble loading the document. Try using the basic viewer instead.",
            });
          }
        } else {
          // Server error or auth issue
          setError(new Error(`Server error (${response.status}). Try refreshing the page.`));
          
          toast({
            title: "Server Error",
            description: `Error ${response.status} accessing document. Try again later.`,
            variant: "destructive"
          });
        }
      } catch (fetchErr) {
        // Network error checking document
        setError(new Error("Network error checking document. Please check your connection."));
        toast({
          title: "Connection Error",
          description: "Network error when checking document. Please check your connection.",
          variant: "destructive"
        });
      }
    } else {
      // No current document
      setError(err);
    }
  }, [current, toast, retryCount, switchToFallbackViewer]);

  // Basic navigation controls
  const goToPreviousPage = useCallback(() => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  }, [numPages]);

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.2, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  // Handle document not selected
  if (!current) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>No document selected</p>
      </div>
    );
  }

  // Determine if document is PDF based on name or known file type
  const isPdfDocument = current.name.toLowerCase().endsWith('.pdf') || 
                        current.name.toLowerCase().includes('.pdf');

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar with navigation, zoom and download controls */}
      <div className="bg-secondary/20 border-b border-border p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!useFallbackViewer && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={pageNumber <= 1 || isLoading}
                aria-label="Previous page"
              >
                Previous
              </Button>
              <span className="text-sm" aria-live="polite">
                {isLoading ? 'Loading...' : `Page ${pageNumber} of ${numPages}`}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={pageNumber >= numPages || isLoading}
                aria-label="Next page"
              >
                Next
              </Button>
            </>
          )}
          {useFallbackViewer && (
            <span className="text-sm font-medium">Using basic document viewer</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!useFallbackViewer && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={zoomOut} 
                disabled={isLoading}
                aria-label="Zoom out"
              >
                -
              </Button>
              <span className="text-sm" aria-live="polite">{Math.round(scale * 100)}%</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={zoomIn} 
                disabled={isLoading}
                aria-label="Zoom in"
              >
                +
              </Button>
            </>
          )}
          
          {/* Viewer toggle buttons */}
          {error && !useFallbackViewer && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={switchToFallbackViewer}
              className="ml-2"
              aria-label="Switch to basic document viewer"
            >
              <FileText className="h-4 w-4 mr-1" />
              Basic Viewer
            </Button>
          )}
          
          {useFallbackViewer && isPdfDocument && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetryPdfJs}
              className="ml-2"
              aria-label="Try PDF viewer again"
            >
              <RotateCw className="h-4 w-4 mr-1" />
              Try PDF Viewer
            </Button>
          )}
          
          {/* Download button */}
          <a
            href={current.downloadUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2"
          >
            <Button 
              variant="outline" 
              size="sm"
              aria-label="Download document"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </a>
        </div>
      </div>

      {/* Document viewer area */}
      <div className="flex-1 overflow-auto bg-background/50 flex justify-center relative">
        {/* Show error state */}
        {error && !useFallbackViewer && (
          <div className="flex flex-col items-center justify-center p-8 text-destructive">
            <p className="font-medium mb-2">Error loading document</p>
            <p className="text-sm mb-4">{error.message}</p>
            
            <div className="flex gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetryPdfJs}
                aria-label="Retry loading PDF"
              >
                <RotateCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
              
              <Button 
                variant="default" 
                size="sm" 
                onClick={switchToFallbackViewer}
                aria-label="Use basic document viewer"
              >
                <FileText className="h-4 w-4 mr-1" />
                Use Basic Viewer
              </Button>
            </div>
          </div>
        )}
        
        {/* Standard PDF.js viewer */}
        {!error && !useFallbackViewer && (
          <Document
            file={current.downloadUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-full w-full">
                <div className="animate-pulse">Loading document...</div>
              </div>
            }
            options={pdfOptions}
          >
            <Page
              key={`page_${pageNumber}_scale_${scale}`} 
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg m-4"
            />
          </Document>
        )}
        
        {/* Fallback iframe viewer - simpler but more reliable */}
        {useFallbackViewer && (
          <div className="w-full h-full flex flex-col">
            <iframe
              ref={iframeRef}
              src={current.downloadUrl}
              className="w-full h-full border-0"
              title={current.name}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setError(new Error("Failed to load document in basic viewer"));
                setIsLoading(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};