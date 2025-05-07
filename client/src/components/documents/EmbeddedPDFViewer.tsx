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
    <div className="space-y-1">
      <div className="flex justify-between items-center h-8 px-1">
        <div className="text-xs text-neutral-500 truncate flex-1">
          {documentName}
        </div>
        <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
          <a href={`/api/documents/${documentId}/download`} target="_blank" rel="noopener noreferrer">
            <Download className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
      
      <Card className="p-0 w-full overflow-hidden">
        <div className="overflow-hidden h-[650px] bg-neutral-50">
          <iframe 
            src={`/api/documents/${documentId}/download`} 
            className="w-full h-full border-0" 
            title={documentName}
          />
        </div>
      </Card>
    </div>
  );
}
