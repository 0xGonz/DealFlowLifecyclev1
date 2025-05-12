import { useState, useCallback, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { useDocs, DocMeta } from '@/context/DocumentsContext';
import { Button } from '@/components/ui/button';
import '@/styles/pdf-layers.css';
// PDF Worker is configured in setupPdfWorker.ts and loaded in main.tsx

export const PdfViewer = () => {
  const { current, setDocs, setCurrent } = useDocs();
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Reset page number when document changes
  useEffect(() => {
    if (current) {
      setPageNumber(1);
      setIsLoading(true);
      setError(null);
    }
  }, [current]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('Error loading PDF:', err);
    setIsLoading(false);
    setError(err);
  }, []);

  const goToPreviousPage = useCallback(() => {
    setPageNumber((prevPageNumber) => Math.max(prevPageNumber - 1, 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setPageNumber((prevPageNumber) => Math.min(prevPageNumber + 1, numPages));
  }, [numPages]);

  const zoomIn = useCallback(() => {
    setScale((prevScale) => Math.min(prevScale + 0.2, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prevScale) => Math.max(prevScale - 0.2, 0.5));
  }, []);

  if (!current) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>No document selected</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-secondary/20 border-b border-border p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={pageNumber <= 1 || isLoading}
          >
            Previous
          </Button>
          <span className="text-sm">
            {isLoading ? 'Loading...' : `Page ${pageNumber} of ${numPages}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages || isLoading}
          >
            Next
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={zoomOut} disabled={isLoading}>
            -
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={zoomIn} disabled={isLoading}>
            +
          </Button>
          <a
            href={current.downloadUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2"
          >
            <Button variant="outline" size="sm">
              Download
            </Button>
          </a>
        </div>
      </div>

      {/* PDF viewer area */}
      <div className="flex-1 overflow-auto bg-background/50 flex justify-center">
        {error ? (
          <div className="flex flex-col items-center justify-center p-8 text-destructive">
            <p className="font-medium mb-2">Error loading document</p>
            <p className="text-sm">{error.message}</p>
          </div>
        ) : (
          <Document
            file={current.downloadUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-full w-full">
                <div className="animate-pulse">Loading document...</div>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-destructive">Failed to load PDF</p>
                <p className="text-sm mt-2">Please try downloading the document instead</p>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg m-4"
            />
          </Document>
        )}
      </div>
    </div>
  );
};