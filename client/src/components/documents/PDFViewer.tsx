import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  documentName: string;
}

export default function PDFViewer({ isOpen, onClose, documentId, documentName }: PDFViewerProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{documentName}</DialogTitle>
          <DialogDescription>
            PDF Preview
          </DialogDescription>
        </DialogHeader>
        
        <div className="border rounded-lg overflow-hidden h-[600px]">
          <object
            data={`/api/documents/${documentId}/download`}
            type="application/pdf"
            className="w-full h-full border-0"
            title={documentName}
          >
            <p className="text-center p-4">
              Your browser doesn't support embedded PDFs. Click the Download button below to view it.
            </p>
          </object>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button asChild>
            <a href={`/api/documents/${documentId}/download`} target="_blank" rel="noopener noreferrer">
              Download
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
