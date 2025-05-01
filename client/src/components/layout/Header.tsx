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
    <header className="bg-white shadow-sm z-20 relative">
      <div className="px-6 py-3">
        <div className="flex items-center space-x-4 justify-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
            <Input 
              type="text" 
              placeholder="Search deals, funds..." 
              className="pl-10 pr-4 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent w-64" 
            />
          </div>
          
          <Button 
            onClick={() => setIsNewDealModalOpen(true)}
            className="bg-primary hover:bg-primary-dark text-white"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Deal
          </Button>
          
          <div className="relative">
            <NotificationDropdown />
          </div>
          
          {/* User Profile Avatar */}
          <div className="relative cursor-pointer group">
            <Avatar>
              <AvatarFallback className="bg-primary text-white">JD</AvatarFallback>
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
