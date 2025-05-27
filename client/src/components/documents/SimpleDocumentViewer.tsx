import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Eye, ZoomIn, ZoomOut, RotateCw, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface SimpleDocumentViewerProps {
  documentId: number;
  documentName: string;
  fileType?: string;
}

const SimpleDocumentViewer = ({ documentId, documentName, fileType }: SimpleDocumentViewerProps) => {
  const { toast } = useToast();
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = documentName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download Started",
      description: `Downloading ${documentName}`,
    });
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  
  const handleSearch = () => {
    if (searchTerm.trim()) {
      // Use browser's built-in search functionality
      const found = document.execCommand('find', false, searchTerm);
      if (!found) {
        // Fallback: Try to trigger browser's native search
        document.dispatchEvent(new KeyboardEvent('keydown', { 
          key: 'f', 
          ctrlKey: true, 
          bubbles: true 
        }));
      }
    }
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      // Focus on search input when opening
      setTimeout(() => {
        const searchInput = document.getElementById('pdf-search-input');
        if (searchInput) searchInput.focus();
      }, 100);
    }
  };

  const renderDocumentViewer = () => {
    const documentUrl = `/api/documents/${documentId}/download`;
    const fileName = documentName.toLowerCase();

    // PDF Viewer
    if (fileName.includes('.pdf')) {
      return (
        <div className="w-full h-full bg-gray-100 rounded-lg overflow-hidden">
          <iframe
            src={`${documentUrl}#zoom=${zoom}`}
            className="w-full h-full border-0"
            title={documentName}
            onLoad={() => setLoading(false)}
            onError={() => {
              setError('Failed to load PDF document');
              setLoading(false);
            }}
          />
        </div>
      );
    }

    // Excel/Spreadsheet Viewer
    if (fileName.includes('.xlsx') || fileName.includes('.xls') || fileName.includes('.csv')) {
      const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + documentUrl)}`;
      
      return (
        <div className="w-full h-full bg-gray-50 rounded-lg overflow-hidden">
          <iframe
            src={viewerUrl}
            className="w-full h-full border-0"
            title={documentName}
            onLoad={() => setLoading(false)}
            onError={() => {
              setError('Failed to load spreadsheet document');
              setLoading(false);
            }}
          />
        </div>
      );
    }

    // Word Document Viewer
    if (fileName.includes('.docx') || fileName.includes('.doc')) {
      const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + documentUrl)}`;
      
      return (
        <div className="w-full h-full bg-gray-50 rounded-lg overflow-hidden">
          <iframe
            src={viewerUrl}
            className="w-full h-full border-0"
            title={documentName}
            onLoad={() => setLoading(false)}
            onError={() => {
              setError('Failed to load Word document');
              setLoading(false);
            }}
          />
        </div>
      );
    }

    // PowerPoint Viewer
    if (fileName.includes('.pptx') || fileName.includes('.ppt')) {
      const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + documentUrl)}`;
      
      return (
        <div className="w-full h-full bg-gray-50 rounded-lg overflow-hidden">
          <iframe
            src={viewerUrl}
            className="w-full h-full border-0"
            title={documentName}
            onLoad={() => setLoading(false)}
            onError={() => {
              setError('Failed to load PowerPoint document');
              setLoading(false);
            }}
          />
        </div>
      );
    }

    // Fallback for other file types
    return (
      <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Preview not available for this file type</p>
          <Button onClick={handleDownload} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download to View
          </Button>
        </div>
      </div>
    );
  };

  const Icon = getFileIcon();

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">{documentName}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* PDF Controls */}
            {documentName.toLowerCase().includes('.pdf') && (
              <>
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600 px-2">{zoom}%</span>
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={toggleSearch}>
                  <Search className="w-4 h-4" />
                </Button>
              </>
            )}
            
            {/* AI Ready Indicator */}
            <div className="flex items-center gap-1 bg-green-50 border border-green-200 rounded px-2 py-1">
              <Eye className="w-3 h-3 text-green-600" />
              <span className="text-xs text-green-700 font-medium">AI Ready</span>
            </div>
            
            {/* Download Button */}
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Search Bar */}
        {showSearch && documentName.toLowerCase().includes('.pdf') && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded">
            <Input
              id="pdf-search-input"
              type="text"
              placeholder="Search in document..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
              size="sm"
            />
            <Button size="sm" onClick={handleSearch} disabled={!searchTerm.trim()}>
              Search
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowSearch(false)}>
              ✕
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 p-4 min-h-0">
        <div className="w-full h-full relative">
          {loading && (
            <div className="absolute inset-0 bg-gray-50 rounded-lg flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-gray-600">Loading document...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 bg-red-50 rounded-lg flex items-center justify-center z-10">
              <div className="text-center">
                <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={handleDownload} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download Instead
                </Button>
              </div>
            </div>
          )}
          
          {renderDocumentViewer()}
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleDocumentViewer;