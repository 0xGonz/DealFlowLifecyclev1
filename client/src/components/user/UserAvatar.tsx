import React from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@shared/schema";

interface UserAvatarProps {
  user: User | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}

export default function UserAvatar({ user, size = 'md' }: UserAvatarProps) {
  if (!user) return null;
  
  const sizeClass = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base'
  }[size];
  
  return (
    <Avatar className={`${sizeClass} bg-${user.avatarColor || 'primary'}`}>
      <AvatarFallback className="font-semibold text-white">
        {user.initials}
      </AvatarFallback>
    </Avatar>
  );
}
