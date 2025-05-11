import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AVATAR_COLORS } from "@/lib/constants/ui-constants";
import { useQuery } from "@tanstack/react-query";

// Common user type that matches what we need across the application
interface UserAvatarProps {
  user: {
    id: number;
    fullName?: string;
    initials?: string;
    avatarColor?: string | null;
    role?: string;
  } | null | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Centralized component for displaying user avatars consistently across the application
 * This will pull the most up-to-date user data from the cache
 */
export function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  // Use a query to get the most recent user data
  const { data: users, isSuccess: usersLoaded } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: !!user?.id, // Only fetch if we have a user ID
    refetchOnWindowFocus: true, // Refetch when window gains focus
    staleTime: 0, // Consider data stale immediately
  });
  
  // Get current user data again from the auth endpoint for the currently logged-in user
  const { data: currentUserMe } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  
  // Use the data from /api/auth/me if this avatar is for the current user
  // Otherwise fall back to the users list
  const currentUserData = (currentUserMe && currentUserMe.id === user?.id) 
    ? currentUserMe 
    : users?.find(u => u.id === user?.id);
    
  // Debug log for avatar color changes
  useEffect(() => {
    if (currentUserData?.avatarColor) {
      console.log(`UserAvatar: User ${currentUserData.id} has color ${currentUserData.avatarColor}`);
    }
  }, [currentUserData?.avatarColor]);
  
  // Size classes mapping
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  // Font size based on avatar size
  const fontSizes = {
    xs: '9px',
    sm: '10px',
    md: '12px',
    lg: '14px'
  };

  // Always use the most recent avatar color from the users cache
  // Fall back to the passed user data if not in cache
  // Finally fall back to default color if nothing else is available
  const avatarColor = currentUserData?.avatarColor || user?.avatarColor || AVATAR_COLORS.DEFAULT;
  
  // Use the most recent initials, or fallback
  const initials = currentUserData?.initials || user?.initials || '??';
  
  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarFallback 
        style={{ 
          backgroundColor: avatarColor,
          color: '#FFFFFF',
          fontSize: fontSizes[size]
        }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}