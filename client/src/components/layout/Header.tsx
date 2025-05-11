import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NewDealModal from "@/components/deals/NewDealModal";
import { Plus, Search, X } from "lucide-react";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/common/UserAvatar";
import ProfileEditModal from "@/components/profile/ProfileEditModal";

// Define interfaces for deal and fund
interface Deal {
  id: number;
  name: string;
  sector: string;
  stageLabel: string;
}

interface Fund {
  id: number;
  name: string;
  vintage: number;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  initials: string;
  role: string;
  avatarColor?: string | null;
}

export default function Header() {
  const [location] = useLocation();
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: 2,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale so it refreshes
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch deals for search
  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });
  
  // Fetch funds for search
  const { data: funds = [] } = useQuery<Fund[]>({
    queryKey: ["/api/funds"],
  });

  // Filter deals and funds based on search query
  const filteredDeals = deals.filter((deal: Deal) => 
    deal.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const filteredFunds = funds.filter((fund: Fund) => 
    fund.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 3);

  // Handle click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Get the page title based on the current location
  const getPageTitle = () => {
    const pathMap: Record<string, string> = {
      "/": "Dashboard",
      "/pipeline": "Pipeline",
      "/leaderboard": "Deal Leaderboard",
      "/funds": "Funds",
      "/settings": "Settings",
      "/users": "Users"
    };

    // Check if the path starts with /deals/
    if (location.startsWith("/deals/")) {
      return "Deal Details";
    }

    return pathMap[location] || "Not Found";
  };

  return (
    <header className="bg-card shadow-sm z-20 sticky top-0 left-0 right-0">
      <div className="px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left side empty */}
          <div className="flex items-center">
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Search box - hidden on small screens */}
            <div className="relative hidden md:block" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
              {searchQuery && (
                <button 
                  onClick={() => {
                    setSearchQuery("");
                    setShowResults(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <Input 
                type="text" 
                placeholder="Search deals, funds..." 
                className="pl-10 pr-10 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent w-64" 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) {
                    setShowResults(true);
                  } else {
                    setShowResults(false);
                  }
                }}
                onFocus={() => {
                  if (searchQuery) {
                    setShowResults(true);
                  }
                }}
              />
              
              {/* Search Results Dropdown */}
              {showResults && searchQuery && (
                <div className="absolute z-50 w-80 bg-white mt-1 rounded-md shadow-lg p-2 border border-neutral-200 overflow-hidden">
                  {filteredDeals.length === 0 && filteredFunds.length === 0 ? (
                    <div className="text-sm p-2 text-neutral-500">No results found</div>
                  ) : (
                    <>
                      {filteredDeals.length > 0 && (
                        <div>
                          <h3 className="text-xs text-neutral-500 uppercase font-semibold mb-1 px-2">Deals</h3>
                          <ul>
                            {filteredDeals.map((deal: Deal) => (
                              <li key={deal.id}>
                                <Link href={`/deals/${deal.id}`}>
                                  <div className="block p-2 hover:bg-neutral-100 rounded-md text-sm cursor-pointer" onClick={() => setShowResults(false)}>
                                    <div className="font-medium">{deal.name}</div>
                                    <div className="text-xs text-neutral-500">{deal.sector} • {deal.stageLabel}</div>
                                  </div>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {filteredFunds.length > 0 && (
                        <div className={cn(filteredDeals.length > 0 && "mt-2")}>
                          <h3 className="text-xs text-neutral-500 uppercase font-semibold mb-1 px-2">Funds</h3>
                          <ul>
                            {filteredFunds.map((fund: Fund) => (
                              <li key={fund.id}>
                                <Link href={`/funds/${fund.id}`}>
                                  <div className="block p-2 hover:bg-neutral-100 rounded-md text-sm cursor-pointer" onClick={() => setShowResults(false)}>
                                    <div className="font-medium">{fund.name}</div>
                                    <div className="text-xs text-neutral-500">{fund.vintage} vintage</div>
                                  </div>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* New Deal Button - smaller on mobile with just icon, text on larger screens */}
            <Button 
              onClick={() => setIsNewDealModalOpen(true)}
              className="bg-primary hover:bg-primary-dark text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 md:h-5 md:w-5 md:mr-2" />
              <span className="hidden md:inline">New Deal</span>
            </Button>
            
            {/* Notification bell */}
            <div className="relative">
              <NotificationDropdown />
            </div>
            
            {/* User profile moved to top right */}
            {currentUser && (
              <div 
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setIsProfileModalOpen(true)}
              >
                <UserAvatar 
                  key={`avatar-${currentUser.id}-${currentUser.avatarColor}`} 
                  user={currentUser} 
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Deal Modal */}
      <NewDealModal
        isOpen={isNewDealModalOpen}
        onClose={() => setIsNewDealModalOpen(false)}
      />
      
      {/* Profile Edit Modal */}
      {currentUser && (
        <ProfileEditModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentName={currentUser?.fullName ?? ''}
          currentRole={currentUser?.role ?? ''}
        />
      )}
    </header>
  );
}
