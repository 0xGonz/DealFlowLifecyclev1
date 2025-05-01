import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

/**
 * Centralized API service for the application
 * This provides a consistent interface for all API calls
 * and handles common patterns like error handling and cache invalidation
 */
export const apiService = {
  // Authentication
  auth: {
    login: async (username: string, password: string) => {
      const response = await apiRequest('POST', '/api/auth/login', { username, password });
      return response.json();
    },
    logout: async () => {
      const response = await apiRequest('POST', '/api/auth/logout');
      return response.json();
    },
    getCurrentUser: async () => {
      const response = await apiRequest('GET', '/api/auth/me');
      return response.json();
    },
  },

  // Users
  users: {
    getAll: async () => {
      const response = await apiRequest('GET', '/api/users');
      return response.json();
    },
    getById: async (id: number) => {
      const response = await apiRequest('GET', `/api/users/${id}`);
      return response.json();
    },
  },

  // Deals
  deals: {
    getAll: async () => {
      const response = await apiRequest('GET', '/api/deals');
      return response.json();
    },
    getById: async (id: number) => {
      const response = await apiRequest('GET', `/api/deals/${id}`);
      return response.json();
    },
    create: async (deal: any) => {
      const response = await apiRequest('POST', '/api/deals', deal);
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      return response.json();
    },
    update: async (id: number, deal: any) => {
      const response = await apiRequest('PATCH', `/api/deals/${id}`, deal);
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${id}`] });
      return response.json();
    },
    delete: async (id: number) => {
      await apiRequest('DELETE', `/api/deals/${id}`);
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
    },
    // Timeline
    getTimeline: async (dealId: number) => {
      const response = await apiRequest('GET', `/api/deals/${dealId}/timeline`);
      return response.json();
    },
    addTimelineEvent: async (dealId: number, event: any) => {
      const response = await apiRequest('POST', `/api/deals/${dealId}/timeline`, event);
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/timeline`] });
      return response.json();
    },
    // Stars
    starDeal: async (dealId: number) => {
      const response = await apiRequest('POST', `/api/deals/${dealId}/star`);
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      return response.json();
    },
    unstarDeal: async (dealId: number) => {
      await apiRequest('DELETE', `/api/deals/${dealId}/star`);
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
    },
    // Memos
    getMemos: async (dealId: number) => {
      const response = await apiRequest('GET', `/api/deals/${dealId}/memos`);
      return response.json();
    },
    addMemo: async (dealId: number, memo: any) => {
      const response = await apiRequest('POST', `/api/deals/${dealId}/memos`, memo);
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/memos`] });
      return response.json();
    },
  },

  // Documents
  documents: {
    getByDeal: async (dealId: number) => {
      const response = await apiRequest('GET', `/api/documents/deal/${dealId}`);
      return response.json();
    },
    upload: async (formData: FormData) => {
      // For file uploads, we need to use fetch directly
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text || response.statusText}`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      return response.json();
    },
    delete: async (id: number) => {
      await apiRequest('DELETE', `/api/documents/${id}`);
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    },
  },

  // Funds
  funds: {
    getAll: async () => {
      const response = await apiRequest('GET', '/api/funds');
      return response.json();
    },
    getById: async (id: number) => {
      const response = await apiRequest('GET', `/api/funds/${id}`);
      return response.json();
    },
    create: async (fund: any) => {
      const response = await apiRequest('POST', '/api/funds', fund);
      queryClient.invalidateQueries({ queryKey: ['/api/funds'] });
      return response.json();
    },
    update: async (id: number, fund: any) => {
      const response = await apiRequest('PATCH', `/api/funds/${id}`, fund);
      queryClient.invalidateQueries({ queryKey: ['/api/funds'] });
      queryClient.invalidateQueries({ queryKey: [`/api/funds/${id}`] });
      return response.json();
    },
  },

  // Dashboard
  dashboard: {
    getStats: async () => {
      const response = await apiRequest('GET', '/api/dashboard/stats');
      return response.json();
    },
    getSectorStats: async () => {
      const response = await apiRequest('GET', '/api/dashboard/sector-stats');
      return response.json();
    },
  },

  // Notifications
  notifications: {
    getAll: async () => {
      const response = await apiRequest('GET', '/api/notifications');
      return response.json();
    },
    getUnreadCount: async () => {
      const response = await apiRequest('GET', '/api/notifications/unread-count');
      return response.json();
    },
    markAsRead: async (id: number) => {
      await apiRequest('POST', `/api/notifications/${id}/read`);
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
    markAllAsRead: async () => {
      await apiRequest('POST', '/api/notifications/mark-all-read');
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  },

  // Activity
  activity: {
    getAll: async () => {
      const response = await apiRequest('GET', '/api/activity');
      return response.json();
    },
  },

  // Leaderboard
  leaderboard: {
    get: async () => {
      const response = await apiRequest('GET', '/api/leaderboard');
      return response.json();
    },
  },
};
