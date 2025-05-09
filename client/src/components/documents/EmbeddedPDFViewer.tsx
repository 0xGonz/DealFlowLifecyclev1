import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText, AlertCircle, X } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Document as PDFDocument, Page as PDFPage } from 'react-pdf';
// Import PDF utilities
import { checkFileExists } from '@/lib/pdf-config';
import { useAuth } from "@/hooks/use-auth";

interface EmbeddedPDFViewerProps {
  documentId: number;
  documentName: string;
}

export default function EmbeddedPDFViewer({ documentId, documentName }: EmbeddedPDFViewerProps) {
  const [pdfFailed, setPdfFailed] = useState(false);
  const [errorType, setErrorType] = useState<'auth' | 'not_found' | 'unknown' | null>(null);
  const [showIframeMode, setShowIframeMode] = useState(false);
  const { toast } = useToast();
  const documentUrl = `/api/documents/${documentId}/download`;
  
  // PDF worker is already configured in main.tsx
  // No need to initialize it again here
  
  // Check if file is likely a PDF
  const isPdfFile = documentName.toLowerCase().endsWith('.pdf') || 
                    documentName.toLowerCase().includes('pdf');

  useEffect(() => {
    // Verify file exists with a HEAD request before trying to render
    const checkFile = async () => {
      try {
        const response = await fetch(documentUrl, { 
          method: 'HEAD',
          headers: {
            'Accept': 'application/json' // Request JSON response for errors
          }
        });
        
        if (!response.ok) {
          setPdfFailed(true);
          
          // Try to get detailed error information
          if (response.headers.get('content-type')?.includes('application/json')) {
            try {
              // For HEAD requests, we can't read the body, so make another request
              const detailResponse = await fetch(documentUrl, { 
                method: 'GET',
                headers: { 'Accept': 'application/json' }
              });
              
              if (detailResponse.headers.get('content-type')?.includes('application/json')) {
                const errorDetails = await detailResponse.json();
                console.log('Error details:', errorDetails);
                
                if (errorDetails.error === 'file_not_found') {
                  setErrorType('not_found');
                } else if (errorDetails.error === 'unauthorized' || 
                           response.status === 401 || 
                           response.status === 403) {
                  setErrorType('auth');
                } else {
                  setErrorType('unknown');
                }
              } else {
                // Fallback to status code-based detection
                if (response.status === 401 || response.status === 403) {
                  setErrorType('auth');
                } else if (response.status === 404) {
                  setErrorType('not_found');
                } else {
                  setErrorType('unknown');
                }
              }
            } catch (detailErr) {
              console.error('Error fetching error details:', detailErr);
              
              // Fallback to status code-based detection
              if (response.status === 401 || response.status === 403) {
                setErrorType('auth');
              } else if (response.status === 404) {
                setErrorType('not_found');
              } else {
                setErrorType('unknown');
              }
            }
          } else {
            // Fallback to status code-based detection
            if (response.status === 401 || response.status === 403) {
              setErrorType('auth');
            } else if (response.status === 404) {
              setErrorType('not_found');
            } else {
              setErrorType('unknown');
            }
          }
        }
      } catch (err) {
        console.error('Error checking file availability:', err);
        setPdfFailed(true);
        setErrorType('unknown');
      }
    };
    
    checkFile();
  }, [documentUrl]);

  // Error handler for PDF viewer 
  const handlePdfError = (error: Error) => {
    console.error('PDF viewer error:', error);
    
    // Determine error type based on error message
    let errorTypeValue: 'auth' | 'not_found' | 'unknown' = 'unknown';
    
    if (error.message && (
        error.message.includes('401') || 
        error.message.toLowerCase().includes('unauthorized') || 
        error.message.toLowerCase().includes('authentication'))) {
      errorTypeValue = 'auth';
    } else if (error.message && error.message.includes('404')) {
      errorTypeValue = 'not_found';
    }
    
    // If it's not an authentication error, we can try the iframe fallback
    if (errorTypeValue !== 'auth' && isPdfFile) {
      console.log('Attempting to use iframe fallback for PDF');
      setShowIframeMode(true);
      // Only set PDF as failed if iframe also fails or isn't an option
      if (!documentUrl || errorTypeValue === 'not_found') {
        setPdfFailed(true);
        setErrorType(errorTypeValue);
        
        // Show a toast for complete failure
        toast({
          title: 'Document Viewer Issue',
          description: 'PDF could not be loaded. This might be because the file is missing or corrupted.',
          variant: 'destructive',
        });
      }
    } else {
      // For auth errors or non-PDFs, we'll show the error state directly
      setPdfFailed(true);
      setErrorType(errorTypeValue);
      
      // Use the determined error type directly in toast
      toast({
        title: 'Document Viewer Issue',
        description: errorTypeValue === 'auth' 
          ? 'Authentication error. Please make sure you have permission to view this document.'
          : 'PDF could not be loaded. This might be because the file is missing or corrupted.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center h-8 px-1">
        <div className="text-xs text-neutral-500 truncate flex-1">
          {documentName}
        </div>
        <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
          <a href={documentUrl} target="_blank" rel="noopener noreferrer" download>
            <Download className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
      
      <Card className="p-0 w-full overflow-hidden">
        <div className="overflow-hidden h-[650px] bg-neutral-50 flex justify-center">
          {/* If it's a PDF and viewer hasn't failed, try PDF.js first */}
          {isPdfFile && !pdfFailed ? (
            <div className="w-full h-full">
              <div id={`pdf-container-${documentId}`} className="w-full h-full">
                <PDFDocument
                  file={documentUrl}
                  onLoadError={(error) => {
                    console.error('PDF loading error:', error);
                    handlePdfError(error);
                    // No need for DOM manipulation, we'll use React to handle the fallback
                  }}
                  className="pdf-document w-full h-full"
                >
                  <PDFPage
                    pageNumber={1}
                    renderAnnotationLayer={false} // Simplify to reduce errors
                    renderTextLayer={false} // Simplify to reduce errors 
                    className="shadow-md"
                    width={800}
                  />
                </PDFDocument>
              </div>
            </div>
          ) : showIframeMode ? (
            // React-based iframe fallback
            <div className="w-full h-full relative">
              <div className="absolute top-0 left-0 right-0 bg-amber-50 text-amber-700 px-3 py-2 text-xs flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                <span>Using alternative viewer. Some features may be limited.</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto h-6 px-2 py-0 text-xs"
                  onClick={() => {
                    setPdfFailed(true);
                    setShowIframeMode(false);
                    setErrorType('unknown');
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Close
                </Button>
              </div>
              <iframe
                src={documentUrl}
                className="w-full h-full border-0 pt-9"
                title={documentName}
                sandbox="allow-same-origin allow-scripts allow-forms"
                onError={() => {
                  console.error('Iframe fallback also failed');
                  setPdfFailed(true);
                  setShowIframeMode(false);
                  setErrorType('unknown');
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-neutral-50">
              <div className="max-w-md text-center">
                {errorType === 'auth' ? (
                  // Authentication error
                  <>
                    <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">Authentication Required</h3>
                    <p className="text-sm text-neutral-600 mb-4">
                      You don't have permission to view "{documentName}".
                    </p>
                    <p className="text-sm text-neutral-600 mb-6">
                      This document might be restricted or require specific permissions. 
                      Contact the document owner if you need access.
                    </p>
                    <div className="text-xs text-neutral-500 bg-neutral-100 p-3 rounded-md mb-4">
                      Document ID: {documentId} • Uploaded by another user
                    </div>
                  </>
                ) : errorType === 'not_found' ? (
                  // File not found error
                  <>
                    <FileText className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">Document Not Found</h3>
                    <p className="text-sm text-neutral-600 mb-4">
                      The document "{documentName}" is missing from the server.
                    </p>
                    <p className="text-sm text-neutral-600 mb-4">
                      This usually happens when:
                    </p>
                    <ul className="text-left text-sm text-neutral-600 mb-4 space-y-1">
                      <li>• The file has been deleted from the server</li>
                      <li>• The file path in the database is incorrect</li>
                      <li>• The document was uploaded but not properly saved</li>
                    </ul>
                    <p className="text-sm text-neutral-600 mb-4">
                      Please upload the document again or contact support if this issue persists.
                    </p>
                  </>
                ) : (
                  // General error
                  <>
                    <FileText className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">Document Preview Failed</h3>
                    <p className="text-sm text-neutral-600 mb-4">
                      The document "{documentName}" could not be loaded.
                    </p>
                    <ul className="text-left text-sm text-neutral-600 mb-4 space-y-1">
                      <li>• The file format might not be supported</li>
                      <li>• The PDF might be encrypted or password-protected</li>
                      <li>• The file might be corrupted</li>
                    </ul>
                    <p className="text-sm text-neutral-600 mb-4">
                      Try downloading the file instead to view it in your local PDF viewer.
                    </p>
                  </>
                )}
                
                {/* Show download button except for auth errors */}
                {errorType !== 'auth' && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="mx-auto"
                  >
                    <a href={documentUrl} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-4 w-4 mr-2" />
                      Try Downloading
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
