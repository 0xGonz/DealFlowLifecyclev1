import { useQuery } from '@tanstack/react-query';

export interface DealContextData {
  deal: any;
  documents: any[];
  memos: any[];
  activities: any[];
  allocations: any[];
  dataFiles: any[];
  loading: boolean;
  error: any;
}

export function useDealContext(dealId: number | null): DealContextData {
  // Fetch deal details
  const { data: deal, isLoading: dealLoading, error: dealError } = useQuery({
    queryKey: [`/api/deals/${dealId}`],
    enabled: !!dealId
  });

  // Fetch documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: [`/api/documents/deal/${dealId}`],
    enabled: !!dealId
  });

  // Fetch memos
  const { data: memos = [], isLoading: memosLoading } = useQuery({
    queryKey: [`/api/deals/${dealId}/memos`],
    enabled: !!dealId
  });

  // Fetch activities
  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: [`/api/deals/${dealId}/activities`],
    enabled: !!dealId
  });

  // Fetch allocations
  const { data: allocations = [], isLoading: allocationsLoading } = useQuery({
    queryKey: [`/api/deals/${dealId}/allocations`],
    enabled: !!dealId
  });

  // Filter data files from documents
  const dataFiles = documents.filter((doc: any) => 
    doc.fileType?.includes('spreadsheet') || 
    doc.fileType?.includes('excel') || 
    doc.fileName?.toLowerCase().includes('.xlsx') ||
    doc.fileName?.toLowerCase().includes('.csv') ||
    doc.fileName?.toLowerCase().includes('.xls')
  );

  const loading = dealLoading || documentsLoading || memosLoading || activitiesLoading || allocationsLoading;

  return {
    deal,
    documents,
    memos,
    activities,
    allocations,
    dataFiles,
    loading,
    error: dealError
  };
}