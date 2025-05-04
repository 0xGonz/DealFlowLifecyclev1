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
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
          <div className="flex-1 mb-2 sm:mb-0">
            <h3 className="text-lg font-medium truncate">{documentName}</h3>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/documents/${documentId}/download`} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-1" />
                Download
              </a>
            </Button>
          </div>
        </div>
        
        <div className="border rounded-lg overflow-hidden h-[500px] bg-neutral-50 relative">
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
