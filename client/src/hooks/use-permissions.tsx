import { useAuth } from '@/hooks/use-auth';

/**
 * Permission levels for user actions
 */
export type Permission = 'create' | 'view' | 'edit' | 'delete';

/**
 * Hook to check if the current user has permission for certain actions
 */
export function usePermissions() {
  const { data: user } = useAuth();
  
  /**
   * Check if user has permission to perform a specific action
   */
  function hasPermission(permission: Permission, resourceType?: string): boolean {
    if (!user) return false;
    
    const { role } = user;
    
    // Admin has all permissions
    if (role === 'admin') return true;
    
    // Partner has all permissions except user management
    if (role === 'partner') {
      if (resourceType === 'user' && permission === 'delete') return false;
      return true;
    }
    
    // Analyst can create, view, edit most resources but cannot delete
    if (role === 'analyst') {
      if (permission === 'delete') return false;
      return true;
    }
    
    // Observer can only view
    if (role === 'observer') {
      return permission === 'view';
    }
    
    // Intern can view everything and only create/edit deals
    if (role === 'intern') {
      if (permission === 'view') return true;
      if (permission === 'create' && resourceType === 'deal') return true;
      if (permission === 'edit' && resourceType === 'deal') return true;
      return false;
    }
    
    return false;
  }
  
  /**
   * Check if user can edit a specific resource
   */
  function canEdit(resourceType: string): boolean {
    return hasPermission('edit', resourceType);
  }
  
  /**
   * Check if user can delete a specific resource
   */
  function canDelete(resourceType: string): boolean {
    return hasPermission('delete', resourceType);
  }
  
  /**
   * Check if user can create a specific resource
   */
  function canCreate(resourceType: string): boolean {
    return hasPermission('create', resourceType);
  }
  
  /**
   * Check if user can view a specific resource
   */
  function canView(resourceType: string): boolean {
    return hasPermission('view', resourceType);
  }
  
  return {
    hasPermission,
    canEdit,
    canDelete,
    canCreate,
    canView,
    userRole: user?.role
  };
}