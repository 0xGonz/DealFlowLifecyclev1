import { useQuery, useMutation } from '@tanstack/react-query';
import { apiService } from '@/lib/services/api';

/**
 * Custom hook for working with notifications
 */
export function useNotifications() {
  // Query to fetch all notifications
  const {
    data: notifications,
    isLoading: isLoadingNotifications,
    error: notificationsError,
    refetch: refetchNotifications
  } = useQuery({
    queryKey: ['/api/notifications'],
    staleTime: 15000, // 15 seconds
  });

  // Query to fetch unread count
  const {
    data: unreadCount,
    isLoading: isLoadingUnreadCount,
    error: unreadCountError,
    refetch: refetchUnreadCount
  } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    staleTime: 15000, // 15 seconds
  });

  // Mutation to mark a notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => apiService.notifications.markAsRead(id),
  });

  // Mutation to mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiService.notifications.markAllAsRead(),
  });

  return {
    // Queries
    notifications,
    isLoadingNotifications,
    notificationsError,
    refetchNotifications,
    unreadCount,
    isLoadingUnreadCount,
    unreadCountError,
    refetchUnreadCount,

    // Mutations
    markAsRead: markAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    markAsReadError: markAsReadMutation.error,

    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    markAllAsReadError: markAllAsReadMutation.error,
  };
}
