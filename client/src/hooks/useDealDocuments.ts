import { useQuery } from '@tanstack/react-query';
import { useDocs, DocMeta } from '@/context/DocumentsContext';
import { useEffect } from 'react';

interface Document {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: string;
  uploadedAt: string;
}

/**
 * Custom hook to fetch and manage document data for a specific deal
 * and sync it with the DocumentsContext
 */
export function useDealDocuments(dealId: number) {
  const { setDocs, setCurrent, current } = useDocs();
  
  // Query to fetch documents for this deal
  const { data, isLoading, error, refetch } = useQuery<Document[]>({
    queryKey: [`/api/documents/deal/${dealId}`],
    enabled: !!dealId,
  });
  
  // Update docs state when data changes
  useEffect(() => {
    console.log(`🔍 useDealDocuments: Processing data for deal ${dealId}:`, data);
    if (data && Array.isArray(data)) {
      // Convert API data to DocMeta format with proper file type info
      const docMetas: DocMeta[] = data.map(doc => ({
        id: doc.id,
        name: doc.fileName,
        fileName: doc.fileName,
        fileType: doc.fileType,
        downloadUrl: `/api/documents/${doc.id}/download`,
        documentType: doc.documentType,
      }));
      
      console.log(`📝 useDealDocuments: Setting ${docMetas.length} documents in context:`, docMetas);
      
      // Update docs state
      setDocs(docMetas);
      
      // Only select first document if no current selection exists
      // This prevents overriding user selections when data refetches
      if (docMetas.length > 0 && !current) {
        console.log(`🎯 useDealDocuments: Auto-selecting first document:`, docMetas[0]);
        setCurrent(docMetas[0]);
      } else if (docMetas.length === 0) {
        console.log(`❌ useDealDocuments: No documents found, clearing selection`);
        setCurrent(null);
      }
    } else {
      console.log(`⚠️ useDealDocuments: No data received or data is not an array:`, data);
    }
  }, [data, setDocs, setCurrent, current, dealId]);
  
  return {
    isLoading,
    error,
    refetch,
  };
}