import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

interface EmbeddedPDFViewerProps {
  documentId: number;
  documentName: string;
}

export default function EmbeddedPDFViewer({ documentId, documentName }: EmbeddedPDFViewerProps) {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-medium truncate mr-2">{documentName}</h3>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/documents/${documentId}/download`} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-1" />
              Download
            </a>
          </Button>
        </div>
        
        <div className="border rounded-lg overflow-hidden h-[500px]">
          <object
            data={`/api/documents/${documentId}/download`}
            type="application/pdf"
            className="w-full h-full border-0"
            title={documentName}
          >
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center p-4">
                <p className="mb-2">Unable to display PDF</p>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/documents/${documentId}/download`} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          </object>
        </div>
      </CardContent>
    </Card>
  );
}
