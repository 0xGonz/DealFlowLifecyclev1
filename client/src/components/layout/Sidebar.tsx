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
  ListFilter,
  Microscope,
  ClipboardCheck,
  ReceiptText,
  PiggyBank,
  XCircle,
  Clock
} from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import doliverLogo from "../../assets/doliver-logo.png";

export default function Sidebar() {
  const [location] = useLocation();
  const [stagesOpen, setStagesOpen] = useState(true);

  // Navigation items
  const mainNavItems = [
    { 
      href: "/", 
      label: "Dashboard", 
      icon: <BarChart3 className="h-5 w-5 mr-3" /> 
    },
    { 
      href: "/pipeline", 
      label: "Pipeline", 
      icon: <Building className="h-5 w-5 mr-3" /> 
    },
    { 
      href: "/leaderboard", 
      label: "Leaderboard", 
      icon: <ChartPieIcon className="h-5 w-5 mr-3" /> 
    },
    { 
      href: "/funds", 
      label: "Funds", 
      icon: <FileText className="h-5 w-5 mr-3" /> 
    },
  ];

  // Deal stages navigation items
  const stageNavItems = [
    { 
      href: "/stages/initial-review", 
      label: "Initial Review", 
      icon: <ListFilter className="h-4 w-4 mr-3" /> 
    },
    { 
      href: "/stages/screening", 
      label: "Screening", 
      icon: <Microscope className="h-4 w-4 mr-3" /> 
    },
    { 
      href: "/stages/diligence", 
      label: "Diligence", 
      icon: <ClipboardCheck className="h-4 w-4 mr-3" /> 
    },
    { 
      href: "/stages/ic-review", 
      label: "IC Review", 
      icon: <ReceiptText className="h-4 w-4 mr-3" /> 
    },
    { 
      href: "/stages/closing", 
      label: "Closing", 
      icon: <Clock className="h-4 w-4 mr-3" /> 
    },
    { 
      href: "/stages/closed", 
      label: "Closed", 
      icon: <PiggyBank className="h-4 w-4 mr-3" /> 
    },
    { 
      href: "/stages/rejected", 
      label: "Rejected", 
      icon: <XCircle className="h-4 w-4 mr-3" /> 
    },
    { 
      href: "/stages/passed", 
      label: "Passed", 
      icon: <Clock className="h-4 w-4 mr-3" /> 
    },
  ];

  const adminNavItems = [
    { 
      href: "/settings", 
      label: "Settings", 
      icon: <Settings className="h-5 w-5 mr-3" /> 
    },
    { 
      href: "/users", 
      label: "Users", 
      icon: <Users className="h-5 w-5 mr-3" /> 
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-md z-30">
      <div className="flex flex-col h-full">
        {/* Logo & Brand */}
        <div className="p-4 border-b border-neutral-200">
          <a href="/" className="flex items-center cursor-pointer">
            <img src={doliverLogo} alt="Doliver Advisors" className="h-10" />
          </a>
        </div>
        
        {/* User Profile moved to bottom */}
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4">
          <ul>
            {mainNavItems.map((item) => (
              <li key={item.href} className="mb-1">
                <a
                  href={item.href}
                  className={`sidebar-nav-link flex items-center py-2 px-4 hover:bg-neutral-200 ${
                    location === item.href
                      ? "active text-primary-dark"
                      : "text-neutral-700"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </a>
              </li>
            ))}
            
            {/* Deal Stages Section */}
            <li className="mt-4 mb-2">
              <Collapsible
                open={stagesOpen}
                onOpenChange={setStagesOpen}
                className="w-full"
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-sm hover:bg-neutral-200">
                  <div className="flex items-center">
                    <Building className="h-4 w-4 mr-2" />
                    <span className="font-semibold">Deal Stages</span>
                  </div>
                  {stagesOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="pl-4">
                    {stageNavItems.map((item) => (
                      <li key={item.href} className="mb-1">
                        <a
                          href={item.href}
                          className={`sidebar-nav-link flex items-center py-2 px-4 text-sm hover:bg-neutral-200 ${
                            location === item.href
                              ? "active text-primary-dark"
                              : "text-neutral-700"
                          }`}
                        >
                          {item.icon}
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </li>
            
            <li className="mt-4 mb-2 px-4">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Admin
              </span>
            </li>
            
            {adminNavItems.map((item) => (
              <li key={item.href} className="mb-1">
                <a
                  href={item.href}
                  className={`sidebar-nav-link flex items-center py-2 px-4 hover:bg-neutral-200 ${
                    location === item.href
                      ? "active text-primary-dark"
                      : "text-neutral-700"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Logout button */}
        <div className="p-4 border-t border-neutral-200">
          <a href="/logout" className="flex items-center text-neutral-700 hover:text-neutral-900">
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </a>
        </div>
      </div>
    </aside>
  );
}
