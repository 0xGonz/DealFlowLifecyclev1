import { useQuery, useMutation, QueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Fund } from '@/lib/types';

// Fund with extended allocation information
export interface FundWithAllocations extends Fund {
  committedCapital: number;
  totalFundSize: number;
  allocationCount: number;
  calledCapital: number;
  uncalledCapital: number;
  allocations?: any[];
}

// Create fund input type
export interface CreateFundInput {
  name: string;
  description?: string;
  vintage?: number;
}

// Update fund input type
export interface UpdateFundInput {
  name?: string;
  description?: string;
  vintage?: number;
}

/**
 * Hook to fetch all funds with allocation statistics
 */
export function useFunds() {
  return useQuery<FundWithAllocations[]>({
    queryKey: ['/api/funds'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a specific fund by ID with detailed allocation information
 */
export function useFund(fundId: number | string) {
  return useQuery<FundWithAllocations>({
    queryKey: ['/api/funds', fundId],
    enabled: !!fundId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a new fund
 */
export function useCreateFund() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (fundData: CreateFundInput): Promise<Fund> => {
      const response = await apiRequest('POST', '/api/funds', fundData);
      return await response.json();
    },
    onSuccess: (newFund) => {
      // Invalidate and refetch funds list
      queryClient.invalidateQueries({ queryKey: ['/api/funds'] });
      
      toast({
        title: 'Success',
        description: `Fund "${newFund.name}" created successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create fund',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update an existing fund
 */
export function useUpdateFund() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      fundId, 
      updates 
    }: { 
      fundId: number | string; 
      updates: UpdateFundInput;
    }): Promise<Fund> => {
      const response = await apiRequest('PATCH', `/api/funds/${fundId}`, updates);
      return await response.json();
    },
    onSuccess: (updatedFund, { fundId }) => {
      // Invalidate both the specific fund and the funds list
      queryClient.invalidateQueries({ queryKey: ['/api/funds'] });
      queryClient.invalidateQueries({ queryKey: ['/api/funds', fundId] });
      
      toast({
        title: 'Success',
        description: `Fund "${updatedFund.name}" updated successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update fund',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a fund
 */
export function useDeleteFund() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (fundId: number | string): Promise<void> => {
      await apiRequest('DELETE', `/api/funds/${fundId}`);
    },
    onSuccess: (_, fundId) => {
      // Remove the fund from cache and refetch list
      queryClient.removeQueries({ queryKey: ['/api/funds', fundId] });
      queryClient.invalidateQueries({ queryKey: ['/api/funds'] });
      
      toast({
        title: 'Success',
        description: 'Fund deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to delete fund. There might be allocations linked to this fund.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to get fund performance metrics
 */
export function useFundMetrics(fundId: number | string) {
  return useQuery({
    queryKey: ['/api/funds', fundId, 'metrics'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/funds/${fundId}`);
      const fund = await response.json();
      
      // Calculate performance metrics
      const totalCommitted = fund.committedCapital || 0;
      const totalCalled = fund.calledCapital || 0;
      const deploymentRate = totalCommitted > 0 ? (totalCalled / totalCommitted) * 100 : 0;
      
      return {
        committedCapital: totalCommitted,
        calledCapital: totalCalled,
        uncalledCapital: fund.uncalledCapital || 0,
        deploymentRate,
        allocationCount: fund.allocationCount || 0,
        aum: fund.aum || 0,
      };
    },
    enabled: !!fundId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}