import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Document as PDFDocument, Page as PDFPage } from 'react-pdf';
// Import centralized PDF configuration
import '@/lib/pdf-config';

interface EmbeddedPDFViewerProps {
  documentId: number;
  documentName: string;
}

export default function EmbeddedPDFViewer({ documentId, documentName }: EmbeddedPDFViewerProps) {
  const [pdfFailed, setPdfFailed] = useState(false);
  const { toast } = useToast();
  const documentUrl = `/api/documents/${documentId}/download`;
  
  // Check if file is likely a PDF
  const isPdfFile = documentName.toLowerCase().endsWith('.pdf') || 
                    documentName.toLowerCase().includes('pdf');

  // Error handler for PDF viewer 
  const handlePdfError = (error: Error) => {
    console.error('PDF viewer error:', error);
    setPdfFailed(true);
    
    toast({
      title: 'Document Viewer Issue',
      description: 'PDF could not be loaded. This might be because the file is missing or corrupted. Trying alternative viewer.',
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
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
