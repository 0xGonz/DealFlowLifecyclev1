import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText, AlertCircle } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Document as PDFDocument, Page as PDFPage } from 'react-pdf';
// Import centralized PDF configuration
import '@/lib/pdf-config';
import { useAuth } from "@/hooks/use-auth";

interface EmbeddedPDFViewerProps {
  documentId: number;
  documentName: string;
}

export default function EmbeddedPDFViewer({ documentId, documentName }: EmbeddedPDFViewerProps) {
  const [pdfFailed, setPdfFailed] = useState(false);
  const [errorType, setErrorType] = useState<'auth' | 'not_found' | 'unknown' | null>(null);
  const { toast } = useToast();
  const documentUrl = `/api/documents/${documentId}/download`;
  
  // Check if file is likely a PDF
  const isPdfFile = documentName.toLowerCase().endsWith('.pdf') || 
                    documentName.toLowerCase().includes('pdf');

  useEffect(() => {
    // Verify file exists with a HEAD request before trying to render
    const checkFile = async () => {
      try {
        const response = await fetch(documentUrl, { method: 'HEAD' });
        if (!response.ok) {
          setPdfFailed(true);
          if (response.status === 401 || response.status === 403) {
            setErrorType('auth');
          } else if (response.status === 404) {
            setErrorType('not_found');
          } else {
            setErrorType('unknown');
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
    setPdfFailed(true);
    
    // Determine error type based on error message
    if (error.message && (
        error.message.includes('401') || 
        error.message.toLowerCase().includes('unauthorized') || 
        error.message.toLowerCase().includes('authentication'))) {
      setErrorType('auth');
    } else if (error.message && error.message.includes('404')) {
      setErrorType('not_found');
    } else {
      setErrorType('unknown');
    }
    
    toast({
      title: 'Document Viewer Issue',
      description: errorType === 'auth' 
        ? 'Authentication error. Please make sure you have permission to view this document.'
        : 'PDF could not be loaded. This might be because the file is missing or corrupted.',
      variant: 'destructive',
    });
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
