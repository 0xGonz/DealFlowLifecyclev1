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
  X
} from "lucide-react";
import doliverLogo from "../../assets/doliver-logo.png";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  onCloseMobile?: () => void;
}

export default function Sidebar({ onCloseMobile }: SidebarProps) {
  const [location] = useLocation();

  // Navigation items
  const mainNavItems = [
    { 
      href: "/", 
      label: "Dashboard", 
      icon: <BarChart3 className="h-4 w-4 mr-2" /> 
    },
    { 
      href: "/pipeline", 
      label: "Pipeline", 
      icon: <Building className="h-4 w-4 mr-2" /> 
    },
    { 
      href: "/leaderboard", 
      label: "Leaderboard", 
      icon: <ChartPieIcon className="h-4 w-4 mr-2" /> 
    },
    { 
      href: "/funds", 
      label: "Funds", 
      icon: <FileText className="h-4 w-4 mr-2" /> 
    },
  ];

  const adminNavItems = [
    { 
      href: "/settings", 
      label: "Settings", 
      icon: <Settings className="h-4 w-4 mr-2" /> 
    },
    { 
      href: "/users", 
      label: "Users", 
      icon: <Users className="h-4 w-4 mr-2" /> 
    },
  ];

  return (
    <aside className="h-full w-48 bg-white shadow-md overflow-y-auto">
      {/* Set fixed width for consistent sidebar rendering */}
      <div className="flex flex-col h-full">
        {/* Logo & Brand with close button for mobile */}
        <div className="p-2 border-b border-neutral-200 flex justify-between items-center">
          <a href="/" className="flex items-center cursor-pointer" onClick={onCloseMobile}>
            <img src={doliverLogo} alt="Doliver Advisors" className="h-7" />
          </a>
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
        
        {/* User Profile moved to bottom */}
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
          <ul>
            {mainNavItems.map((item) => (
              <li key={item.href} className="mb-0.5 px-1">
                <a
                  href={item.href}
                  className={`sidebar-nav-link flex items-center py-1.5 px-2 hover:bg-neutral-100 transition-colors rounded-md text-xs ${
                    location === item.href
                      ? "active bg-neutral-100 text-primary-dark font-medium"
                      : "text-neutral-700"
                  }`}
                  onClick={() => onCloseMobile && window.innerWidth < 768 && onCloseMobile()}
                >
                  {item.icon}
                  {item.label}
                </a>
              </li>
            ))}
            
            <li className="mt-4 mb-2 px-2">
              <span className="text-2xs font-semibold text-neutral-500 uppercase tracking-wider">
                Admin
              </span>
            </li>
            
            {adminNavItems.map((item) => (
              <li key={item.href} className="mb-0.5 px-1">
                <a
                  href={item.href}
                  className={`sidebar-nav-link flex items-center py-1.5 px-2 hover:bg-neutral-100 transition-colors rounded-md text-xs ${
                    location === item.href
                      ? "active bg-neutral-100 text-primary-dark font-medium"
                      : "text-neutral-700"
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
        
        {/* Logout button */}
        <div className="p-2 border-t border-neutral-200">
          <a 
            href="/logout" 
            className="flex items-center py-1.5 px-2 rounded-md text-xs text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            onClick={() => onCloseMobile && window.innerWidth < 768 && onCloseMobile()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </a>
        </div>
      </div>
    </aside>
  );
}
