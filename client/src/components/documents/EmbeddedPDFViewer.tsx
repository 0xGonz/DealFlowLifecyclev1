import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText, RefreshCw } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Document as PDFDocument, Page as PDFPage } from 'react-pdf';
import { getWorkerStatus } from '@/lib/setupPdfWorker';

interface EmbeddedPDFViewerProps {
  documentId: number;
  documentName: string;
}

export default function EmbeddedPDFViewer({ documentId, documentName }: EmbeddedPDFViewerProps) {
  const [pdfFailed, setPdfFailed] = useState(false);
  const [useDirectUrl, setUseDirectUrl] = useState(false);
  const [isCheckingDocument, setIsCheckingDocument] = useState(false);
  const { toast } = useToast();
  const documentUrl = `/api/documents/${documentId}/download`;
  
  // Check if file is likely a PDF
  const isPdfFile = documentName.toLowerCase().endsWith('.pdf') || 
                    documentName.toLowerCase().includes('pdf');

  // State to track detailed error information
  const [errorDetails, setErrorDetails] = useState<any>(null);

  // Verify the document is accessible before attempting to render
  useEffect(() => {
    // Always pre-check document existence on initial mount
    // and also whenever PDF.js fails to load the document
    const shouldCheckDocument = 
      !isCheckingDocument && (pdfFailed || !localStorage.getItem(`document-${documentId}-verified`));
      
    if (shouldCheckDocument) {
      setIsCheckingDocument(true);
      
      // First try HEAD request to check if document exists without downloading
      fetch(documentUrl, { 
        method: 'HEAD',
        credentials: 'include' // Include cookies for auth
      })
        .then(response => {
          if (response.ok) {
            // Document exists
            // Set a flag in localStorage to avoid repeated checks for this document
            localStorage.setItem(`document-${documentId}-verified`, 'true');
            
            if (pdfFailed) {
              // If PDF.js failed but document exists, try fallback
              setUseDirectUrl(true);
              toast({
                title: 'Using Basic Viewer',
                description: 'Document exists but using simpler viewer for compatibility.'
              });
            }
          } else if (response.status === 404) {
            // Document is genuinely missing - get detailed error info
            localStorage.removeItem(`document-${documentId}-verified`);
            setPdfFailed(true);
            
            // Make a GET request to also get error details from the JSON response
            fetch(documentUrl, { 
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              },
              credentials: 'include'
            })
              .then(response => response.json())
              .then(data => {
                console.log('Detailed error info:', data);
                setErrorDetails(data);
                
                // Show a more specific message if available
                const detailMessage = data.details?.note || data.message || 'The file appears to be missing. Please try uploading it again.';
                
                toast({
                  title: 'Document Not Found',
                  description: detailMessage,
                  variant: 'destructive',
                });
              })
              .catch(error => {
                console.error('Error getting detailed error info:', error);
                // Fallback to generic message
                toast({
                  title: 'Document Not Found',
                  description: 'The file appears to be missing. Please try uploading it again.',
                  variant: 'destructive',
                });
              });
          } else {
            // Other server error
            localStorage.removeItem(`document-${documentId}-verified`);
            toast({
              title: 'Server Error',
              description: `Error ${response.status} accessing document. Try again later.`,
              variant: 'destructive',
            });
          }
        })
        .catch((error) => {
          // Network error checking document
          console.error('Error checking document existence:', error);
          localStorage.removeItem(`document-${documentId}-verified`);
          toast({
            title: 'Connection Error',
            description: 'Could not verify document availability due to network issues.',
            variant: 'destructive',
          });
        })
        .finally(() => {
          setIsCheckingDocument(false);
        });
    }
  }, [pdfFailed, documentUrl, toast, isCheckingDocument, documentId]);

  // Classify error type to determine proper handling
  const classifyPdfError = useCallback((error: Error) => {
    // Check if this is a file not found error
    if (error.message && (
      error.message.includes('404') || 
      error.message.includes('not found') || 
      error.message.toLowerCase().includes('missingpdfexception')
    )) {
      return 'file-not-found';
    }
    
    // Check if this is a worker-related error
    if (error.message && (
      error.message.includes('worker') ||
      error.message.includes('import') ||
      error.message.includes('module')
    )) {
      return 'worker-error';
    }
    
    // PDF.js frozen object error
    if (error.message && (
      error.message.includes('read-only') ||
      error.message.includes('frozen') ||
      error.message.includes('assign') ||
      error.message.includes('Cannot set')
    )) {
      return 'frozen-object-error';
    }
    
    // Default - general error
    return 'general-error';
  }, []);

  // Error handler for PDF viewer
  const handlePdfError = useCallback((error: Error) => {
    console.error('PDF viewer error:', error);
    
    // Log the worker status for debugging
    console.log('PDF Worker Status:', getWorkerStatus());
    
    // Mark PDF as failed for UI state
    setPdfFailed(true);
    
    // Determine error type and handle appropriately
    const errorType = classifyPdfError(error);
    
    switch (errorType) {
      case 'file-not-found':
        toast({
          title: 'Document Not Found',
          description: 'The file appears to be missing. Please try uploading it again.',
          variant: 'destructive',
        });
        break;
      
      case 'worker-error':
        // Try to fix the worker configuration
        const newStatus = tryFixPdfWorker();
        console.log('PDF Worker reconfigured:', newStatus);
        
        toast({
          title: 'PDF Worker Issue',
          description: 'Reconfigured PDF viewer. Please try again.',
        });
        break;
      
      case 'frozen-object-error':
        toast({
          title: 'PDF.js Error',
          description: 'Incompatible PDF viewer configuration. Switching to basic viewer.',
        });
        // Go directly to fallback
        setUseDirectUrl(true);
        break;
      
      default:
        toast({
          title: 'Switching Viewers',
          description: 'PDF could not be loaded. Trying alternative viewer.',
        });
    }
  }, [toast, classifyPdfError]);

  const handleRetry = useCallback(() => {
    // Reset UI state
    setPdfFailed(false);
    setUseDirectUrl(false);
    
    // Try to fix PDF worker if there might be configuration issues
    const workerStatus = tryFixPdfWorker();
    console.log('PDF Worker Status after retry:', workerStatus);
    
    toast({
      title: "Retrying Document",
      description: "Attempting to load the document again with reconfigured viewer.",
    });
  }, [toast]);

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center h-8 px-1">
        <div className="text-xs text-neutral-500 truncate flex-1">
          {documentName}
        </div>
        <div className="flex gap-1">
          {pdfFailed && (
            <Button variant="ghost" size="sm" onClick={handleRetry} className="h-6 w-6 p-0" title="Retry loading">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0" title="Download document">
            <a href={documentUrl} target="_blank" rel="noopener noreferrer" download>
              <Download className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
      
      <Card className="p-0 w-full overflow-hidden">
        <div className="overflow-hidden h-[40vh] min-h-[300px] max-h-[80vh] sm:h-[45vh] sm:min-h-[350px] lg:h-[50vh] lg:min-h-[400px] bg-neutral-50 flex justify-center">
          {/* First attempt: If it's a PDF and viewer hasn't failed, try PDF.js first */}
          {isPdfFile && !pdfFailed ? (
            <div className="w-full h-full">
              <div id={`pdf-container-${documentId}`} className="w-full h-full">
                <PDFDocument
                  file={documentUrl}
                  onLoadError={handlePdfError}
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
            </div>
          ) : useDirectUrl && isPdfFile ? (
            // Second attempt: Direct iframe approach for PDFs
            <iframe 
              src={documentUrl}
              className="w-full h-full border-0"
              title={documentName}
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          ) : (
            // Fallback: Error state with detailed message
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-neutral-50">
              <div className="max-w-md text-center">
                <FileText className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">Document Preview Failed</h3>
                <p className="text-sm text-neutral-600 mb-4">
                  The document "{documentName}" could not be loaded. This could be because:
                </p>
                <ul className="text-left text-sm text-neutral-600 mb-4 space-y-1">
                  <li>• The file has been deleted from the server</li>
                  <li>• The file was not properly saved during upload</li>
                  <li>• The file might be corrupted</li>
                  {errorDetails && errorDetails.details?.note && (
                    <li className="text-amber-700 font-medium pt-1">• {errorDetails.details.note}</li>
                  )}
                </ul>
                
                {/* Technical details for debugging (collapsible) */}
                {errorDetails && (
                  <details className="text-left text-xs text-neutral-500 mb-4 bg-neutral-100 p-2 rounded">
                    <summary className="cursor-pointer">Technical Details</summary>
                    <div className="pt-2 space-y-1">
                      <p>Error Code: {errorDetails.error}</p>
                      <p>Document ID: {errorDetails.details?.documentId}</p>
                      <p>Last Updated: {errorDetails.details?.uploadedAt ? new Date(errorDetails.details.uploadedAt).toLocaleString() : 'Unknown'}</p>
                    </div>
                  </details>
                )}
                
                <p className="text-sm text-neutral-600 mb-6">
                  Please try uploading the document again.
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    aria-label="Retry loading document"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a 
                      href={documentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      download
                      aria-label="Download document"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
