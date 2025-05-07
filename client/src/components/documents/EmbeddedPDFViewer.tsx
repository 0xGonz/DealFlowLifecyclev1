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
      title: 'Using simple document viewer',
      description: 'PDF viewer could not be initialized. Using simple document viewer instead.',
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
            <iframe 
              src={documentUrl} 
              className="w-full h-full border-0" 
              title={documentName}
              onError={() => {
                toast({
                  title: 'Document preview error',
                  description: 'Unable to preview this document. You can download it to view locally.',
                  variant: 'destructive',
                });
              }}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
