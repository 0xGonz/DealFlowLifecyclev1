import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  BarChart3, 
  Building, 
  ChartPieIcon, 
  FileText, 
  LogOut, 
  Settings, 
  Users,
  X,
  DollarSign,
  CalendarIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileEditModal from "@/components/profile/ProfileEditModal";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { LAYOUT, AVATAR_COLORS } from "@/lib/constants/ui-constants";
import { DEFAULT_AVATAR_TEXT } from "@/lib/constants/display-constants";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";

interface SidebarProps {
  onCloseMobile?: () => void;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  initials: string;
  role: string;
  avatarColor?: string | null;
}

export default function Sidebar({ onCloseMobile }: SidebarProps) {
  const [location] = useLocation();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { logout } = useAuth();
  
  // Fetch current user
  const { data: currentUser, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Navigation items
  const mainNavItems = [
    { 
      href: "/", 
      label: "Dashboard", 
      icon: <BarChart3 className="h-5 w-5 mr-2" /> 
    },
    { 
      href: "/pipeline", 
      label: "Pipeline", 
      icon: <Building className="h-5 w-5 mr-2" /> 
    },
    { 
      href: "/leaderboard", 
      label: "Leaderboard", 
      icon: <ChartPieIcon className="h-5 w-5 mr-2" /> 
    },
    { 
      href: "/funds", 
      label: "Funds", 
      icon: <FileText className="h-5 w-5 mr-2" /> 
    },
    { 
      href: "/calendar", 
      label: "Calendar", 
      icon: <CalendarIcon className="h-5 w-5 mr-2" /> 
    },
  ];

  const adminNavItems = [
    { 
      href: "/settings", 
      label: "Settings", 
      icon: <Settings className="h-5 w-5 mr-2" /> 
    },
    { 
      href: "/users", 
      label: "Users", 
      icon: <Users className="h-5 w-5 mr-2" /> 
    },
  ];

  return (
    <aside className={`h-full bg-card shadow-md overflow-y-auto flex-shrink-0`} style={{ width: LAYOUT.SIDEBAR_WIDTH }}>
      {/* Set fixed width for consistent sidebar rendering */}
      <div className="flex flex-col h-full">
        {/* User Profile at the top with close button for mobile */}
        <div className="p-3 border-b border-border flex justify-between items-center">
          <div 
            className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-1 rounded-md transition-colors" 
            onClick={() => setIsProfileModalOpen(true)}
          >
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex flex-col">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16 mt-1" />
                </div>
              </>
            ) : currentUser ? (
              <>
                <Avatar key="user-avatar" className="h-8 w-8" style={currentUser.avatarColor ? {backgroundColor: currentUser.avatarColor} : {backgroundColor: AVATAR_COLORS.DEFAULT}}>
                  <AvatarFallback className="bg-primary text-white">{currentUser.initials || DEFAULT_AVATAR_TEXT}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{currentUser.fullName}</span>
                  <span className="text-xs text-neutral-500 capitalize">{currentUser.role}</span>
                </div>
              </>
            ) : (
              <>
                <Avatar key="guest-avatar" className="h-8 w-8" style={{backgroundColor: AVATAR_COLORS.GRAY}}>
                  <AvatarFallback className="bg-primary text-white">GU</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Guest User</span>
                  <span className="text-xs text-neutral-500">Not signed in</span>
                </div>
              </>
            )}
          </div>
          {onCloseMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden" 
              onClick={onCloseMobile}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
          <ul>
            {mainNavItems.map((item) => (
              <li key={item.href} className="mb-1 px-2">
                <a
                  href={item.href}
                  className={`sidebar-nav-link flex items-center py-2 px-3 hover:bg-muted transition-colors rounded-md text-sm ${
                    location === item.href
                      ? "active bg-muted text-primary-dark font-medium"
                      : "text-foreground"
                  }`}
                  onClick={() => onCloseMobile && window.innerWidth < 768 && onCloseMobile()}
                >
                  {item.icon}
                  {item.label}
                </a>
              </li>
            ))}
            
            <li className="mt-4 mb-2 px-2">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Admin
              </span>
            </li>
            
            {adminNavItems.map((item) => (
              <li key={item.href} className="mb-1 px-2">
                <a
                  href={item.href}
                  className={`sidebar-nav-link flex items-center py-2 px-3 hover:bg-muted transition-colors rounded-md text-sm ${
                    location === item.href
                      ? "active bg-muted text-primary-dark font-medium"
                      : "text-foreground"
                  }`}
                  onClick={() => onCloseMobile && window.innerWidth < 768 && onCloseMobile()}
                >
                  {item.icon}
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Theme and logout section */}
        <div className="p-3 border-t border-neutral-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider pl-3">
              Theme
            </div>
            <ThemeToggle />
          </div>
          
          <a 
            href="#" 
            className="flex items-center py-2 px-3 rounded-md text-sm text-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={(e) => {
              e.preventDefault();
              logout.mutate();
              onCloseMobile && window.innerWidth < 768 && onCloseMobile();
            }}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </a>
        </div>

        {/* Profile Edit Modal */}
        <ProfileEditModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentName={currentUser?.fullName ?? ''}
          currentRole={currentUser?.role ?? ''}
        />
      </div>
    </aside>
  );
}
