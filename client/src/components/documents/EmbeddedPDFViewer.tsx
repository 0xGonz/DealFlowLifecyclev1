import React, { useState, useEffect } from 'react';
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

  // Verify the document is accessible before attempting to render
  useEffect(() => {
    if (!isCheckingDocument && pdfFailed) {
      setIsCheckingDocument(true);
      
      // Use HEAD request to check if document exists without downloading
      fetch(documentUrl, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            // Document exists, but PDF.js couldn't render it
            // Try fallback to direct iframe
            setUseDirectUrl(true);
            toast({
              title: 'Using Basic Viewer',
              description: 'Document exists but using simpler viewer for compatibility.'
            });
          } else if (response.status === 404) {
            // Document is genuinely missing
            toast({
              title: 'Document Not Found',
              description: 'The file appears to be missing. Please try uploading it again.',
              variant: 'destructive',
            });
          }
        })
        .catch(() => {
          // Network error checking document
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
  }, [pdfFailed, documentUrl, toast, isCheckingDocument]);

  // Error handler for PDF viewer
  const handlePdfError = (error: Error) => {
    console.error('PDF viewer error:', error);
    
    // Log the worker status for debugging
    console.log('PDF Worker Status:', getWorkerStatus());
    
    setPdfFailed(true);
    
    // Check if this is a 404 Not Found or missing file error
    const isFileNotFound = 
      error.message && (
        error.message.includes('404') || 
        error.message.includes('not found') || 
        error.message.toLowerCase().includes('missingpdfexception')
      );
    
    if (isFileNotFound) {
      toast({
        title: 'Document Not Found',
        description: 'The file appears to be missing. Please try uploading it again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Switching Viewers',
        description: 'PDF could not be loaded. Trying alternative viewer.',
      });
    }
  };

  const handleRetry = () => {
    setPdfFailed(false);
    setUseDirectUrl(false);
    
    // Log PDF worker status for debugging
    console.log('PDF Worker Status:', getWorkerStatus());
    
    toast({
      title: "Retrying Document",
      description: "Attempting to load the document again.",
    });
  };

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
        <div className="overflow-hidden h-[650px] bg-neutral-50 flex justify-center">
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
                </ul>
                <p className="text-sm text-neutral-600 mb-6">
                  Please try uploading the document again.
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={documentUrl} target="_blank" rel="noopener noreferrer" download>
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
