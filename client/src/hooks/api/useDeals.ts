import { useQuery, useMutation } from '@tanstack/react-query';
import { apiService } from '@/lib/services/api';

/**
 * Custom hook for working with deals data
 * 
 * Provides query and mutation functions for the deals API
 */
export function useDeals() {
  // Query to fetch all deals
  const {
    data: deals,
    isLoading: isLoadingDeals,
    error: dealsError,
    refetch: refetchDeals,
  } = useQuery({
    queryKey: ['/api/deals'],
    staleTime: 60000, // 1 minute
  });

  // Query for deal stats by sector
  const {
    data: sectorStats,
    isLoading: isLoadingSectorStats,
    error: sectorStatsError,
  } = useQuery({
    queryKey: ['/api/dashboard/sector-stats'],
    staleTime: 300000, // 5 minutes
  });

  // Mutation to create a new deal
  const createDealMutation = useMutation({
    mutationFn: (newDeal: any) => apiService.deals.create(newDeal),
  });

  // Mutation to update a deal
  const updateDealMutation = useMutation({
    mutationFn: ({ id, dealData }: { id: number; dealData: any }) =>
      apiService.deals.update(id, dealData),
  });

  // Mutation to delete a deal
  const deleteDealMutation = useMutation({
    mutationFn: (id: number) => apiService.deals.delete(id),
  });

  // Mutation to star a deal
  const starDealMutation = useMutation({
    mutationFn: (dealId: number) => apiService.deals.starDeal(dealId),
  });

  // Mutation to unstar a deal
  const unstarDealMutation = useMutation({
    mutationFn: (dealId: number) => apiService.deals.unstarDeal(dealId),
  });

  return {
    // Queries
    deals,
    isLoadingDeals,
    dealsError,
    refetchDeals,
    sectorStats,
    isLoadingSectorStats,
    sectorStatsError,

    // Mutations
    createDeal: createDealMutation.mutate,
    isCreatingDeal: createDealMutation.isPending,
    createDealError: createDealMutation.error,

    updateDeal: updateDealMutation.mutate,
    isUpdatingDeal: updateDealMutation.isPending,
    updateDealError: updateDealMutation.error,

    deleteDeal: deleteDealMutation.mutate,
    isDeletingDeal: deleteDealMutation.isPending,
    deleteDealError: deleteDealMutation.error,

    starDeal: starDealMutation.mutate,
    isStarringDeal: starDealMutation.isPending,
    starDealError: starDealMutation.error,

    unstarDeal: unstarDealMutation.mutate,
    isUnstarringDeal: unstarDealMutation.isPending,
    unstarDealError: unstarDealMutation.error,
  };
}

/**
 * Custom hook for working with a specific deal
 */
export function useDeal(dealId: number | null) {
  const {
    data: deal,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: dealId ? [`/api/deals/${dealId}`] : null,
    enabled: !!dealId,
    staleTime: 60000, // 1 minute
  });

  // Timeline events for the deal
  const {
    data: timelineEvents,
    isLoading: isLoadingTimeline,
    error: timelineError,
    refetch: refetchTimeline,
  } = useQuery({
    queryKey: dealId ? [`/api/deals/${dealId}/timeline`] : null,
    enabled: !!dealId,
    staleTime: 30000, // 30 seconds
  });

  // Memos for the deal
  const {
    data: memos,
    isLoading: isLoadingMemos,
    error: memosError,
    refetch: refetchMemos,
  } = useQuery({
    queryKey: dealId ? [`/api/deals/${dealId}/memos`] : null,
    enabled: !!dealId,
  });

  // Documents for the deal
  const {
    data: documents,
    isLoading: isLoadingDocuments,
    error: documentsError,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: dealId ? [`/api/documents/deal/${dealId}`] : null,
    enabled: !!dealId,
  });

  // Mutation to add a timeline event
  const addTimelineEventMutation = useMutation({
    mutationFn: (event: any) => 
      dealId ? apiService.deals.addTimelineEvent(dealId, event) : Promise.reject('No deal ID'),
  });

  // Mutation to add a memo
  const addMemoMutation = useMutation({
    mutationFn: (memo: any) => 
      dealId ? apiService.deals.addMemo(dealId, memo) : Promise.reject('No deal ID'),
  });

  return {
    // Deal data
    deal,
    isLoading,
    error,
    refetch,

    // Timeline
    timelineEvents,
    isLoadingTimeline,
    timelineError,
    refetchTimeline,
    addTimelineEvent: addTimelineEventMutation.mutate,
    isAddingTimelineEvent: addTimelineEventMutation.isPending,
    timelineEventError: addTimelineEventMutation.error,

    // Memos
    memos,
    isLoadingMemos,
    memosError,
    refetchMemos,
    addMemo: addMemoMutation.mutate,
    isAddingMemo: addMemoMutation.isPending,
    memoError: addMemoMutation.error,

    // Documents
    documents,
    isLoadingDocuments,
    documentsError,
    refetchDocuments,
  };
}
