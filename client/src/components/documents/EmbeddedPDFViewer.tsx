import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

interface EmbeddedPDFViewerProps {
  documentId: number;
  documentName: string;
}

export default function EmbeddedPDFViewer({ documentId, documentName }: EmbeddedPDFViewerProps) {
  // Simplified PDF viewer using iframe
  return (
    <Card className="w-full overflow-hidden">
      {/* Small control bar above the document */}
      <div className="flex justify-between items-center p-2 bg-neutral-50 border-b">
        <div className="flex items-center">
          <div className="mr-2 flex-shrink-0 flex items-center justify-center bg-neutral-100 p-1 rounded-lg">
            <FileText className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-medium text-neutral-800 truncate">{documentName}</h4>
        </div>
        <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
          <a href={`/api/documents/${documentId}/download`} target="_blank" rel="noopener noreferrer">
            <Download className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
      
      {/* Document display - taller height */}
      <div className="h-[650px] bg-neutral-50">
        <iframe 
          src={`/api/documents/${documentId}/download`} 
          className="w-full h-full border-0" 
          title={documentName}
        />
      </div>
    </Card>
  );
}
