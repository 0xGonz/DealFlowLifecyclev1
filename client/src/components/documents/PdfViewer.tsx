import { useDocs } from '@/context/DocumentsContext';
import { FileText } from 'lucide-react';
import UniversalDocumentViewer from './UniversalDocumentViewer';

export const PdfViewer = () => {
  const { current } = useDocs();

  // No document selected
  if (!current) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-neutral-50">
        <FileText className="h-16 w-16 text-neutral-400 mb-4" />
        <h3 className="text-lg font-medium text-neutral-900 mb-2">No Document Selected</h3>
        <p className="text-sm text-neutral-600 text-center max-w-md">
          Select a document from the sidebar to view it here. Our viewer supports PDFs, Excel files, CSV data, and images - perfect for investment analysis.
        </p>
        <div className="mt-4 text-xs text-neutral-500 bg-blue-50 px-3 py-2 rounded">
          💡 AI-Ready: All document types will be available for AI analysis
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <UniversalDocumentViewer 
        documentId={current.id} 
        documentName={current.fileName}
        fileType={current.fileType}
      />
    </div>
  );
};