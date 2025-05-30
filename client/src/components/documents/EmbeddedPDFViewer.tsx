import React, { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, ZoomIn, ZoomOut, RotateCw, FileText, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// Configure PDF.js worker - use inline worker for compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js`;

interface EmbeddedPDFViewerProps {
  documentId: number;
  documentName: string;
  fileType?: string;
}

const EmbeddedPDFViewer = ({ documentId, documentName, fileType }: EmbeddedPDFViewerProps) => {
  const { toast } = useToast();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');

  // Generate PDF URL
  useEffect(() => {
    if (documentId) {
      const url = `/api/documents/${documentId}/download`;
      console.log('📤 Loading PDF document:', { documentId, documentName, url });
      setPdfUrl(url);
    }
  }, [documentId, documentName]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('✅ PDF loaded successfully:', { numPages, documentName });
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
    setError(null);
  }, [documentName]);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('❌ PDF load error:', error);
    setError(`Failed to load PDF: ${error.message}`);
    setLoading(false);
  }, []);

  const handleDownload = async () => {
    try {
      const response = await fetch(pdfUrl, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Started",
        description: `${documentName} is downloading`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download the document",
        variant: "destructive",
      });
    }
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => Math.min(Math.max(prevPageNumber + offset, 1), numPages));
  };

  const changeScale = (newScale: number) => {
    setScale(Math.min(Math.max(newScale, 0.5), 2.0));
  };

  const changeRotation = () => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  };

  if (!pdfUrl) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Preparing PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center p-8">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">PDF Load Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-2">
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
            <Button onClick={handleDownload} variant="default">
              <Download className="h-4 w-4 mr-2" />
              Download Instead
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium text-gray-900 truncate max-w-md">{documentName}</h3>
          {loading && <span className="text-sm text-gray-500">Loading...</span>}
        </div>
        
        <div className="flex items-center space-x-2">
          {numPages > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(-1)}
                disabled={pageNumber <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                {pageNumber} of {numPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(1)}
                disabled={pageNumber >= numPages}
              >
                Next
              </Button>
              
              <div className="border-l pl-2 ml-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changeScale(scale - 0.1)}
                  disabled={scale <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="mx-2 text-sm">{Math.round(scale * 100)}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changeScale(scale + 0.1)}
                  disabled={scale >= 2.0}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={changeRotation}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </>
          )}
          
          <Button onClick={handleDownload} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-center">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-pulse" />
                  <p className="text-gray-600">Loading PDF...</p>
                </div>
              </div>
            }
            error={
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-600">Failed to load PDF document</p>
                </div>
              </div>
            }
          >
            {numPages > 0 && (
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-lg"
              />
            )}
          </Document>
        </div>
      </div>
    </div>
  );
};

export default EmbeddedPDFViewer;