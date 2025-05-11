import React from "react";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/common/UserAvatar";

interface User {
  id: number;
  fullName: string;
  username: string;
  email: string;
  role: "admin" | "partner" | "analyst" | "observer" | "intern";
  initials: string;
  avatarColor?: string;
  lastActive?: string;
}

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  listView?: boolean;
}

// Role color mapping for badges
const getRoleBadgeColor = (role: string) => {
  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-800",
    partner: "bg-blue-100 text-blue-800",
    analyst: "bg-green-100 text-green-800",
    observer: "bg-orange-100 text-orange-800",
    intern: "bg-purple-100 text-purple-800"
  };
  
  return roleColors[role] || "bg-gray-100 text-gray-800";
};

export default function UserCard({ user, onEdit, onDelete, listView = false }: UserCardProps) {
  if (listView) {
    // Grid layout for admin table view
    return (
      <div className="grid grid-cols-12 gap-4 p-4 items-center">
        <div className="col-span-5 flex items-center gap-3">
          <UserAvatar 
            user={user} 
            size="sm"
          />
          <div>
            <div className="font-medium">{user.fullName}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <span>@{user.username}</span>
              <span className="text-neutral-300">•</span>
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </span>
            </div>
          </div>
        </div>
        <div className="col-span-3">
          <Badge className={`${getRoleBadgeColor(user.role)} capitalize`}>
            {user.role}
          </Badge>
        </div>
        <div className="col-span-3 text-sm text-muted-foreground">
          {user.lastActive 
            ? `${new Date(user.lastActive).toLocaleDateString()} at ${new Date(user.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : "N/A"}
        </div>
        <div className="col-span-1 flex">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onEdit(user)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit User</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onDelete(user)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete User</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  }
  
  // Card view for team page
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
      <div className="flex items-center">
        <UserAvatar 
          user={user}
          size="md"
        />
        <div className="ml-4">
          <h3 className="text-base font-medium">{user.fullName}</h3>
          <div className="flex items-center mt-1">
            <Badge
              variant="secondary"
              className={`${getRoleBadgeColor(user.role)} mr-2 capitalize`}
            >
              {user.role}
            </Badge>
            <span className="text-sm text-gray-500">@{user.username}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center mt-4 sm:mt-0 space-x-2">
        <a
          href={`mailto:${user.email}`}
          className="text-gray-500 hover:text-gray-700"
        >
          <Mail className="h-5 w-5" />
        </a>
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => onEdit(user)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => onDelete(user)}
          className="text-red-500 hover:text-red-700 hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}