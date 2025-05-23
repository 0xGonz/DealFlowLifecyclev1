import React from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Eye, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface SimpleDocumentViewerProps {
  documentId: number;
  documentName: string;
  fileType?: string;
}

const SimpleDocumentViewer = ({ documentId, documentName, fileType }: SimpleDocumentViewerProps) => {
  const { toast } = useToast();

  const getFileIcon = () => {
    if (!fileType) return FileText;
    
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet;
    return FileText;
  };

  const getFileTypeLabel = () => {
    if (!fileType) return 'Document';
    
    if (fileType.includes('pdf')) return 'PDF Document';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'Excel Spreadsheet';
    if (fileType.includes('csv')) return 'CSV Data';
    return 'Document';
  };

  const handleDownload = () => {
    const downloadUrl = `/api/documents/${documentId}/download`;
    window.open(downloadUrl, '_blank');
    toast({
      title: "Download Started",
      description: `Downloading ${documentName}`,
    });
  };

  const handleViewInBrowser = () => {
    const viewUrl = `/api/documents/${documentId}/download`;
    window.open(viewUrl, '_blank');
    toast({
      title: "Opening Document",
      description: `Opening ${documentName} in new tab`,
    });
  };

  const Icon = getFileIcon();

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-blue-600" />
          Document Viewer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Document Info */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center">
            <Icon className="w-8 h-8 text-blue-600" />
          </div>
          
          <div>
            <h3 className="font-semibold text-lg text-gray-900 mb-1">
              {documentName}
            </h3>
            <p className="text-sm text-gray-500">
              {getFileTypeLabel()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={handleViewInBrowser}
            className="w-full flex items-center gap-2"
            variant="default"
          >
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </Button>
          
          <Button 
            onClick={handleDownload}
            className="w-full flex items-center gap-2"
            variant="outline"
          >
            <Download className="w-4 h-4" />
            Download Document
          </Button>
        </div>

        {/* Investment Analysis Ready Note */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Eye className="w-4 h-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Ready for Analysis
              </p>
              <p className="text-xs text-green-700 mt-1">
                This document is accessible and ready for your investment team's review and analysis.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleDocumentViewer;