import { useQuery } from '@tanstack/react-query';
import { useDocs, DocMeta } from '@/context/DocumentsContext';
import { useEffect } from 'react';

interface Document {
  id: number;
  fileName: string;
  fileSize: number;
  documentType: string;
  createdAt: string;
  documentUrl: string;
  downloadUrl: string;
}

/**
 * Custom hook to fetch and manage document data for a specific deal
 * and sync it with the DocumentsContext
 */
export function useDealDocuments(dealId: number) {
  const { setDocs, setCurrent } = useDocs();
  
  // Query to fetch documents for this deal
  const { data, isLoading, error, refetch } = useQuery<Document[]>({
    queryKey: [`/api/documents/deal/${dealId}`],
    enabled: !!dealId,
  });
  
  // Update docs state when data changes
  useEffect(() => {
    if (data && Array.isArray(data)) {
      // Convert API data to DocMeta format
      const docMetas: DocMeta[] = data.map(doc => ({
        id: doc.id,
        name: doc.fileName,
        downloadUrl: `/api/documents/${doc.id}/download`,
      }));
      
      // Update docs state
      setDocs(docMetas);
      
      // Select first document as current if available
      if (docMetas.length > 0 && docMetas[0]) {
        setCurrent(docMetas[0]);
      } else {
        setCurrent(null);
      }
    }
  }, [data, setDocs, setCurrent]);
  
  return {
    isLoading,
    error,
    refetch,
  };
}