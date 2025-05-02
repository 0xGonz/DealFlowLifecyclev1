import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NewDealModal from "@/components/deals/NewDealModal";
import { Plus, Search } from "lucide-react";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";

export default function Header() {
  const [location] = useLocation();
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);

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
    <header className="bg-white shadow-sm z-20 sticky top-0 left-0 right-0">
      <div className="px-4 md:px-6 py-3">
        <div className="flex items-center space-x-2 md:space-x-4 justify-end">
          {/* Search box - hidden on small screens */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
            <Input 
              type="text" 
              placeholder="Search deals, funds..." 
              className="pl-10 pr-4 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent w-64" 
            />
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
          
          <div className="relative">
            <NotificationDropdown />
          </div>
          
          {/* User Profile Avatar */}
          <div className="relative cursor-pointer group">
            <Avatar className="h-8 w-8 md:h-10 md:w-10">
              <AvatarFallback className="bg-primary text-white text-xs md:text-sm">JD</AvatarFallback>
            </Avatar>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 hidden group-hover:block">
              <a href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Manage Profile</a>
              <a href="/logout" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Logout</a>
            </div>
          </div>
        </div>
      </div>

      {/* New Deal Modal */}
      <NewDealModal
        isOpen={isNewDealModalOpen}
        onClose={() => setIsNewDealModalOpen(false)}
      />
    </header>
  );
}
