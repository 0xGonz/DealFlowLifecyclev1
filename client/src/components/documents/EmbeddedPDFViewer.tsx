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
    <Card className="w-full">
      <div className="p-3 bg-neutral-50 border-b flex justify-between items-center">
        <div className="flex-1">
          <h3 className="text-base font-medium truncate">{documentName}</h3>
        </div>
        <div className="flex space-x-1">
          <Button variant="ghost" size="sm" asChild className="h-8 px-2">
            <a href={`/api/documents/${documentId}/download`} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="border rounded-lg overflow-hidden h-[650px] bg-neutral-50 relative">
          <iframe 
            src={`/api/documents/${documentId}/download`} 
            className="w-full h-full border-0" 
            title={documentName}
          />
        </div>
      </CardContent>
    </Card>
  );
}
